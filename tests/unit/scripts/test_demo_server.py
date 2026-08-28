#!/usr/bin/env python3
"""
test_demo_server.py --- unit tests for the seeded in-memory demo store

Contains:
    seeded(): builds a store filled with demo runs
"""

import pytest

from scripts.demo_server import DEMO_REPOS, InMemoryResultsStore, build_app, seed


@pytest.fixture
def store() -> InMemoryResultsStore:
    """Builds a store filled with demo runs.

    Returns:
        store: Seeded in-memory store.
    """
    return seed(InMemoryResultsStore())


def test_every_demo_repo_has_runs(store: InMemoryResultsStore) -> None:
    """Verifies the dashboard has something to show for each repo."""
    assert store.repos_with_runs() == sorted(DEMO_REPOS)


def test_runs_come_back_newest_first(store: InMemoryResultsStore) -> None:
    """Verifies ordering, which the run table relies on."""
    created = [run["created_at"] for run in store.list_runs()]
    assert created == sorted(created, reverse=True)


def test_a_run_carries_its_scores(store: InMemoryResultsStore) -> None:
    """Verifies get_run returns scores alongside the record."""
    run = store.get_run("llmjudge-001")
    assert run is not None
    assert run["scores"]["faithfulness"] > 0


def test_an_unknown_run_is_none(store: InMemoryResultsStore) -> None:
    """Verifies a missing run reads as absent rather than raising."""
    assert store.get_run("nope") is None


def test_limit_bounds_the_listing(store: InMemoryResultsStore) -> None:
    """Verifies the limit argument is honoured."""
    assert len(store.list_runs(limit=2)) == 2


def test_repo_filter_selects_one_repo(store: InMemoryResultsStore) -> None:
    """Verifies filtering returns only that repo's runs."""
    assert {run["repo"] for run in store.list_runs("llmjudge")} == {"llmjudge"}


def test_latest_run_is_the_newest(store: InMemoryResultsStore) -> None:
    """Verifies latest_run agrees with the head of the listing."""
    latest = store.latest_run("llmjudge")
    assert latest is not None
    assert latest["id"] == store.list_runs("llmjudge")[0]["id"]


def test_latest_run_carries_its_scores(store: InMemoryResultsStore) -> None:
    """Verifies latest_run returns scores, as ResultsStore.latest_run does."""
    latest = store.latest_run("llmjudge")
    assert latest is not None
    assert latest["scores"] == store.scores[str(latest["id"])]


def test_latest_run_is_none_for_an_unseeded_repo(store: InMemoryResultsStore) -> None:
    """Verifies a repo with no runs reports none rather than raising."""
    assert store.latest_run("unknown-repo") is None


def test_delete_removes_the_run_and_its_scores(store: InMemoryResultsStore) -> None:
    """Verifies deletion is reported and leaves nothing behind."""
    assert store.delete_run("llmjudge-001") is True
    assert store.get_run("llmjudge-001") is None
    assert store.delete_run("llmjudge-001") is False


def test_scores_stay_in_range(store: InMemoryResultsStore) -> None:
    """Verifies seeded scores are normalized, as every metric promises."""
    for scores in store.scores.values():
        assert all(0.0 <= value <= 1.0 for value in scores.values())


def test_build_app_serves_the_seeded_data() -> None:
    """Verifies the demo app answers from memory, with no database configured."""
    from fastapi.testclient import TestClient

    client = TestClient(build_app())
    assert client.get("/health").status_code == 200
    assert client.get("/repos").json() == sorted(DEMO_REPOS)
