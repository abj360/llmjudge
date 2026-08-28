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
DEMO_METRICS = ("faithfulness", "answer_relevancy", "contextual_precision", "hallucination")
RUNS_PER_REPO = 8

# Each repo gets a starting score per metric and a per-run drift, chosen so the
# seeded set lands on both sides of the thresholds in ci/thresholds.yaml rather
# than showing an unbroken row of passes.
DEMO_PROFILES = {
    "llmjudge": ((0.93, 0.89, 0.87, 0.95), 0.004),
    "graphmind": ((0.86, 0.82, 0.79, 0.90), 0.003),
    "retrieval-core": ((0.88, 0.83, 0.77, 0.86), -0.011),
    "agentflow": ((0.84, 0.79, 0.72, 0.81), -0.016),
    "shipwright": ((0.91, 0.88, 0.84, 0.92), -0.009),
}
DEMO_REPOS = tuple(DEMO_PROFILES)

# Runs that never produced scores, so the dashboard has to render a lifecycle
# that is not "succeeded" everywhere.
DEMO_INCIDENTS = {("agentflow", 6): "failed", ("retrieval-core", 7): "running"}


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
            run: Newest run record with its scores, or None when the repo has none.
        """
        runs = self.list_runs(repo, limit=1)
        return self.get_run(str(runs[0]["id"])) if runs else None

    def metric_history(self, repo: str, metric: str, limit: int = 30) -> list[dict[str, Any]]:
        """Fetches one metric's score history for a repo, oldest-first.

        Args:
            repo: Repo whose history is wanted.
            metric: Metric name.
            limit: Maximum points to return.

        Returns:
            history: (created_at, score) points oldest-first.
        """
        points = [
            {"created_at": run["created_at"], "score": self.scores[run["id"]][metric]}
            for run in reversed(self.list_runs(repo))
            if metric in self.scores.get(str(run["id"]), {})
        ]
        return points[-limit:]

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
    """Fills a store with several runs per repo, drifting scores over time.

    Args:
        store: Store to populate.

    Returns:
        store: The same store, seeded.
    """
    start = datetime.now(UTC) - timedelta(days=21)
    for repo_index, (repo, (bases, drift)) in enumerate(DEMO_PROFILES.items()):
        for run_index in range(RUNS_PER_REPO):
            run_id = f"{repo}-{run_index + 1:03d}"
            status = DEMO_INCIDENTS.get((repo, run_index), "succeeded")
            store.insert_run(run_id, repo, status=status)
            created = start + timedelta(hours=run_index * 61 + repo_index * 7)
            store.runs[run_id]["created_at"] = created.isoformat()
            if status != "succeeded":
                continue
            for metric_index, metric in enumerate(DEMO_METRICS):
                wobble = ((run_index * 7 + metric_index * 3) % 5 - 2) * 0.004
                score = bases[metric_index] + drift * run_index + wobble
                store.upsert_score(run_id, metric, round(min(1.0, max(0.0, score)), 3))
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
