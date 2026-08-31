#!/usr/bin/env python3
"""
test_results_api.py --- unit tests for the results API routes

Contains:
    test_list_runs: GET /runs returns store rows
    test_get_run_404: unknown run id returns 404
"""

from datetime import UTC

from fastapi.testclient import TestClient

from api.deps import get_store
from api.main import create_app


class FakeStore:
    """In-memory store stand-in for route tests.

    Attributes:
        runs: Run payloads keyed by id.
    """

    def __init__(self) -> None:
        """Initializes one canned run."""
        self.runs = {"r-1": {"id": "r-1", "repo": "agentflow", "status": "succeeded", "scores": {}}}

    def list_runs(self, repo: str | None = None, limit: int = 50) -> list[dict]:
        """Returns canned runs, honoring the repo filter."""
        return [run for run in self.runs.values() if repo is None or run["repo"] == repo]

    def get_run(self, run_id: str) -> dict | None:
        """Returns the canned run or None."""
        return self.runs.get(run_id)

    def insert_run(self, run_id: str, repo: str) -> None:
        """Records a created run in memory."""
        self.runs[run_id] = {"id": run_id, "repo": repo, "status": "queued", "scores": {}}


def make_client(store: FakeStore) -> TestClient:
    """Builds a TestClient with the store dependency overridden.

    Args:
        store: Fake store to inject.

    Returns:
        client: TestClient bound to the app.
    """
    app = create_app()
    app.dependency_overrides[get_store] = lambda: store
    return TestClient(app)


def test_list_runs() -> None:
    """GET /runs returns the store's rows."""
    client = make_client(FakeStore())
    response = client.get("/runs")
    assert response.status_code == 200
    assert response.json()[0]["id"] == "r-1"


def test_get_run_404() -> None:
    """Unknown run id returns 404."""
    client = make_client(FakeStore())
    assert client.get("/runs/nope").status_code == 404


def test_get_run_found() -> None:
    """Known run id returns its payload."""
    client = make_client(FakeStore())
    response = client.get("/runs/r-1")
    assert response.status_code == 200
    assert response.json()["repo"] == "agentflow"


def test_create_run() -> None:
    """POST /runs creates the run and returns 201."""
    store = FakeStore()
    client = make_client(store)
    response = client.post("/runs", json={"id": "r-2", "repo": "graphmind"})
    assert response.status_code == 201
    assert "r-2" in store.runs


def test_list_runs_repo_filter() -> None:
    """GET /runs?repo= filters by repo."""
    client = make_client(FakeStore())
    response = client.get("/runs", params={"repo": "agentflow"})
    assert len(response.json()) == 1
    response = client.get("/runs", params={"repo": "other"})
    assert response.json() == []


def test_add_score_validates_range() -> None:
    """Scores outside [0, 1] are rejected with 422."""
    store = FakeStore()
    store.upsert_score = lambda *args: None
    client = make_client(store)
    response = client.post("/runs/r-1/scores", params={"metric": "m", "score": 1.5})
    assert response.status_code == 422


def test_health() -> None:
    """Health endpoint answers ok."""
    client = make_client(FakeStore())
    assert client.get("/health").json() == {"status": "ok"}


def test_serialize_run_timestamps() -> None:
    """serialize_run renders aware timestamps with a Z suffix."""
    from datetime import datetime

    from api.routes.results import serialize_run

    run = {"id": "r", "created_at": datetime(2026, 6, 26, tzinfo=UTC)}
    assert serialize_run(run)["created_at"].endswith("Z")


def test_get_scores() -> None:
    """GET /runs/{id}/scores returns the scores mapping."""
    client = make_client(FakeStore())
    assert client.get("/runs/r-1/scores").json() == {}


def test_delete_run() -> None:
    """DELETE /runs/{id} removes the run."""
    store = FakeStore()
    store.delete_run = lambda run_id: run_id in store.runs
    client = make_client(store)
    assert client.delete("/runs/r-1").status_code == 204
    assert client.delete("/runs/nope").status_code == 404


def test_list_runs_limit_param() -> None:
    """GET /runs accepts a limit parameter."""
    store = FakeStore()
    store.list_runs = lambda repo=None, limit=50: []
    client = make_client(store)
    assert client.get("/runs", params={"limit": 5}).status_code == 200


def test_create_run_missing_field_422() -> None:
    """POST /runs without a repo returns 422."""
    client = make_client(FakeStore())
    assert client.post("/runs", json={"id": "r-9"}).status_code == 422


def test_openapi_lists_runs() -> None:
    """OpenAPI schema includes the runs paths."""
    client = make_client(FakeStore())
    schema = client.get("/openapi.json").json()
    assert "/runs" in schema["paths"]


def test_app_title_llmjudge() -> None:
    """API title is llmjudge."""
    client = make_client(FakeStore())
    assert client.get("/openapi.json").json()["info"]["title"] == "llmjudge"


def test_list_repos() -> None:
    """GET /repos returns distinct repo names."""
    store = FakeStore()
    store.repos_with_runs = lambda: ["agentflow", "llmjudge"]
    client = make_client(store)
    assert client.get("/repos").json() == ["agentflow", "llmjudge"]


def test_get_run_scores_shape() -> None:
    """Run payload carries a scores mapping."""
    client = make_client(FakeStore())
    payload = client.get("/runs/r-1").json()
    assert isinstance(payload["scores"], dict)


def test_404_detail_message() -> None:
    """Missing run 404 carries a detail message."""
    client = make_client(FakeStore())
    assert client.get("/runs/nope").json()["detail"] == "run not found"


def test_list_metric_names() -> None:
    """GET /metrics returns the registry names."""
    client = make_client(FakeStore())
    names = client.get("/metrics").json()
    assert "faithfulness" in names


def test_latest_run_route() -> None:
    """GET /repos/{repo}/latest returns the newest run."""
    store = FakeStore()
    store.latest_run = lambda repo: store.runs["r-1"]
    client = make_client(store)
    assert client.get("/repos/agentflow/latest").json()["id"] == "r-1"


def test_latest_run_404_without_runs() -> None:
    """Latest-run route 404s when the repo has no runs."""
    store = FakeStore()
    store.latest_run = lambda repo: None
    client = make_client(store)
    assert client.get("/repos/empty/latest").status_code == 404


def test_metric_history_returns_points_oldest_first() -> None:
    """Verifies the trend chart gets its points in chart order."""
    from fastapi.testclient import TestClient

    from scripts.demo_server import build_app

    client = TestClient(build_app())
    points = client.get("/repos/llmjudge/history", params={"metric": "faithfulness"}).json()
    assert len(points) > 1
    assert [p["created_at"] for p in points] == sorted(p["created_at"] for p in points)


def test_metric_history_is_empty_for_an_unknown_repo() -> None:
    """Verifies an unknown repo charts as empty rather than erroring."""
    from fastapi.testclient import TestClient

    from scripts.demo_server import build_app

    client = TestClient(build_app())
    response = client.get("/repos/nope/history", params={"metric": "faithfulness"})
    assert response.status_code == 200
    assert response.json() == []


def test_metric_history_rejects_an_out_of_range_limit() -> None:
    """Verifies a limit outside the accepted range is refused, not clamped."""
    from fastapi.testclient import TestClient

    from scripts.demo_server import build_app

    client = TestClient(build_app())
    for limit in (0, 100_000):
        response = client.get(
            "/repos/llmjudge/history", params={"metric": "faithfulness", "limit": limit}
        )
        assert response.status_code == 422
