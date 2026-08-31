#!/usr/bin/env python3
"""
demo_server.py --- runs the results API against seeded in-memory data

Lets the API and dashboard be driven without Postgres, which is what
run_server.sh falls back to when docker is unavailable. It swaps the store
dependency for an in-memory one holding a few runs; nothing here touches a
database, and it is not a production path.

Contains:
    InMemoryResultsStore: the store surface the routes use, held in memory
    seed(): fills a store with a small set of demo runs
    build_app(): builds the API with the in-memory store injected
    main(): serves the demo API
"""

import os
from datetime import UTC, datetime, timedelta
from typing import Any

import uvicorn
from fastapi import FastAPI

from api.deps import get_store
from api.main import create_app

DEFAULT_PORT = 8000
DEMO_REPOS = ("retrieval-core", "agentflow", "graphmind", "llmjudge", "shipwright")
DEMO_METRICS = {
    "faithfulness": 0.91,
    "answer_relevancy": 0.86,
    "contextual_precision": 0.83,
    "hallucination": 0.94,
}


class InMemoryResultsStore:
    """Holds runs and scores in memory for the demo server.

    Implements only the methods the routes call, so it stands in for
    ResultsStore without a database behind it.

    Attributes:
        runs: Run records keyed by run id.
        scores: Metric scores keyed by run id.
    """

    def __init__(self) -> None:
        """Starts an empty store."""
        self.runs: dict[str, dict[str, Any]] = {}
        self.scores: dict[str, dict[str, float]] = {}

    def insert_run(self, run_id: str, repo: str, status: str = "queued") -> None:
        """Records a new run.

        Args:
            run_id: Unique run identifier.
            repo: Repo the run evaluates.
            status: Lifecycle status to record.
        """
        self.runs[run_id] = {
            "id": run_id,
            "repo": repo,
            "status": status,
            "created_at": datetime.now(UTC).isoformat(),
        }
        self.scores.setdefault(run_id, {})

    def upsert_score(self, run_id: str, metric: str, score: float) -> None:
        """Records or replaces one metric score.

        Args:
            run_id: Run the score belongs to.
            metric: Metric name.
            score: Normalized score.
        """
        self.scores.setdefault(run_id, {})[metric] = score

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        """Fetches one run with its scores.

        Args:
            run_id: Run to fetch.

        Returns:
            run: Run record with scores, or None when unknown.
        """
        run = self.runs.get(run_id)
        if run is None:
            return None
        return {**run, "scores": dict(self.scores.get(run_id, {}))}

    def list_runs(self, repo: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        """Lists runs newest-first, optionally filtered by repo.

        Args:
            repo: Repo to filter by, or None for all.
            limit: Maximum runs to return.

        Returns:
            runs: Matching run records.
        """
        runs = [r for r in self.runs.values() if repo is None or r["repo"] == repo]
        runs.sort(key=lambda r: str(r["created_at"]), reverse=True)
        return runs[:limit]

    def latest_run(self, repo: str) -> dict[str, Any] | None:
        """Fetches the newest run for a repo.

        Args:
            repo: Repo to look up.

        Returns:
            run: Newest run record, or None when the repo has none.
        """
        runs = self.list_runs(repo, limit=1)
        return runs[0] if runs else None

    def repos_with_runs(self) -> list[str]:
        """Lists repos that have at least one run.

        Returns:
            repos: Sorted distinct repo names.
        """
        return sorted({str(run["repo"]) for run in self.runs.values()})

    def delete_run(self, run_id: str) -> bool:
        """Removes one run and its scores.

        Args:
            run_id: Run to remove.

        Returns:
            removed: True when the run existed.
        """
        self.scores.pop(run_id, None)
        return self.runs.pop(run_id, None) is not None


def seed(store: InMemoryResultsStore) -> InMemoryResultsStore:
    """Fills a store with a few runs per repo, drifting scores over time.

    Args:
        store: Store to populate.

    Returns:
        store: The same store, seeded.
    """
    created = datetime.now(UTC) - timedelta(days=len(DEMO_REPOS) * 3)
    for repo_index, repo in enumerate(DEMO_REPOS):
        for run_index in range(3):
            run_id = f"{repo}-{run_index + 1:03d}"
            store.insert_run(run_id, repo, status="succeeded")
            created += timedelta(hours=7)
            store.runs[run_id]["created_at"] = created.isoformat()
            for metric, base in DEMO_METRICS.items():
                drift = (run_index - 1) * 0.02 - repo_index * 0.005
                store.upsert_score(run_id, metric, round(min(1.0, max(0.0, base + drift)), 3))
    return store


def build_app() -> FastAPI:
    """Builds the API with the seeded in-memory store injected.

    Returns:
        app: The API, reading from memory rather than Postgres.
    """
    store = seed(InMemoryResultsStore())
    app = create_app()
    app.dependency_overrides[get_store] = lambda: store
    return app


def main() -> int:
    """Serves the demo API until interrupted.

    Returns:
        exit_code: Always 0.
    """
    port = int(os.environ.get("PORT", DEFAULT_PORT))
    uvicorn.run(build_app(), host="127.0.0.1", port=port, log_level="warning")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
