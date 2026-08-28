#!/usr/bin/env python3
"""
test_thresholds_api.py --- unit tests for the thresholds API route

Contains:
    client: TestClient over the real app
    test_serves_the_default_floor: the default threshold is exposed
    test_serves_every_repo_override: per-repo entries are exposed
    test_agrees_with_the_merge_gate: the route and the gate resolve alike
    test_reports_unavailable_config: an unreadable config answers 503
"""

import pytest
from fastapi.testclient import TestClient

from api.main import create_app
from ci.check_thresholds import load_threshold_config, resolve_threshold


@pytest.fixture
def client() -> TestClient:
    """Builds a client over the application.

    Returns:
        client: TestClient bound to the app.
    """
    return TestClient(create_app())


def test_serves_the_default_floor(client: TestClient) -> None:
    """Verifies the default threshold reaches the caller."""
    body = client.get("/thresholds").json()
    assert body["default"] == load_threshold_config()["default_threshold"]


def test_serves_every_repo_override(client: TestClient) -> None:
    """Verifies every configured repo appears in the response."""
    body = client.get("/thresholds").json()
    assert set(body["repos"]) == set(load_threshold_config()["repos"])


def test_agrees_with_the_merge_gate(client: TestClient) -> None:
    """Verifies the route resolves the same floor the gate applies.

    The dashboard marks regressions against this response, so a disagreement
    here would put the dashboard and the merge gate at odds.
    """
    config = load_threshold_config()
    body = client.get("/thresholds").json()
    for repo in config["repos"]:
        assert body["repos"][repo] == resolve_threshold(config, repo).threshold


def test_reports_unavailable_config(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """Verifies an unreadable config answers 503 rather than a stale default."""

    def explode(*_args: object, **_kwargs: object) -> dict[str, object]:
        raise OSError("thresholds.yaml is gone")

    monkeypatch.setattr("api.routes.thresholds.load_threshold_config", explode)
    assert client.get("/thresholds").status_code == 503
