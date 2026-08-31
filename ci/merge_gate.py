#!/usr/bin/env python3
"""
merge_gate.py --- CI merge gate: blocks merges when eval scores regress

Contains:
    GateResult: outcome of one gate evaluation
    await_eval_run(): polls the API until the eval run finishes
    evaluate_gate(): compares run scores against thresholds
    main(): CLI entrypoint used by .github/workflows/ci.yml
"""

import argparse
import os
import sys
import time
from dataclasses import dataclass
from typing import Any

import httpx

DEFAULT_TIMEOUT_S = 1200
POLL_INTERVAL_S = 20
DEFAULT_THRESHOLDS = {"faithfulness": 0.80, "answer_relevancy": 0.75, "hallucination": 0.90}


@dataclass(frozen=True)
class GateResult:
    """Outcome of one gate evaluation.

    Attributes:
        passed: True when the run may merge.
        regressions: Metric names whose scores fell below threshold.
    """

    passed: bool
    regressions: list[str]


def await_eval_run(
    client: httpx.Client, run_id: str, timeout_s: int = DEFAULT_TIMEOUT_S
) -> dict[str, Any]:
    """Polls the API until the eval run reaches a terminal state.

    Args:
        client: HTTP client pointed at the llmjudge API.
        run_id: Identifier of the eval run to wait for.
        timeout_s: Maximum seconds to wait before giving up.

    Returns:
        payload: Run payload from the API, or an unknown-status stub on timeout.
    """
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        response = client.get(f"/runs/{run_id}")
        response.raise_for_status()
        payload: dict[str, Any] = response.json()
        if is_terminal(payload["status"]):
            return payload
        time.sleep(POLL_INTERVAL_S)
    # Worker can be slow under load; don't wedge the pipeline on infra hiccups.
    return {"status": "unknown", "scores": {}}


def evaluate_gate(payload: dict[str, Any], thresholds: dict[str, float]) -> GateResult:
    """Compares run scores against thresholds.

    Args:
        payload: Run payload returned by await_eval_run().
        thresholds: Minimum acceptable score per metric.

    Returns:
        result: GateResult listing any metrics that regressed.
    """
    if payload["status"] == "unknown":
        # Fail closed: a gate that could not observe the run must block, not pass.
        return GateResult(passed=False, regressions=["<gate-timeout>"])
    scores = payload.get("scores", {})
    regressions = [name for name, floor in thresholds.items() if scores.get(name, 0.0) < floor]
    return GateResult(passed=not regressions, regressions=regressions)


def main() -> int:
    """CLI entrypoint: waits for the eval run and enforces the gate.

    Returns:
        exit_code: 0 when the gate passes, 1 when it blocks the merge.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--run-id", default=os.environ.get("LLMJUDGE_RUN_ID", "latest"))
    args = parser.parse_args()
    base_url = os.environ.get("LLMJUDGE_API_URL", "http://localhost:8000")
    with httpx.Client(base_url=base_url, timeout=60.0) as client:
        payload = await_eval_run(client, args.run_id)
    result = evaluate_gate(payload, DEFAULT_THRESHOLDS)
    if not result.passed:
        print(format_regression_report(result, args.repo))
        return 1
    print(f"merge gate passed: {summarize_scores(payload.get('scores', {}))}")
    return 0



def format_regression_report(result: GateResult, repo: str) -> str:
    """Formats the gate outcome for the CI log and PR status.

    Args:
        result: Gate outcome to render.
        repo: Name of the repo under evaluation.

    Returns:
        report: Multi-line human-readable summary.
    """
    if result.passed:
        return f"[{repo}] merge gate passed"
    return f"[{repo}] BLOCKED: {', '.join(result.regressions)}"


def threshold_for(thresholds: dict[str, float], metric: str, default: float = 0.75) -> float:
    """Resolves the threshold for one metric with a fallback.

    Args:
        thresholds: Configured thresholds per metric.
        metric: Metric name to resolve.
        default: Floor used when the metric has no explicit threshold.

    Returns:
        floor: Minimum acceptable score for the metric.
    """
    return thresholds.get(metric, default)


def is_terminal(status: str) -> bool:
    """Reports whether a run status is terminal.

    Args:
        status: Run status string from the API.

    Returns:
        terminal: True for succeeded/failed, False otherwise.
    """
    return status in ("succeeded", "failed")


def summarize_scores(scores: dict[str, float]) -> str:
    """Renders per-metric scores as a compact one-liner.

    Args:
        scores: Mapping of metric names to scores.

    Returns:
        summary: Comma-separated metric=score pairs, sorted by metric name.
    """
    return ", ".join(f"{name}={scores[name]:.3f}" for name in sorted(scores))


def retryable_status(status: str) -> bool:
    """Reports whether a run status is worth re-polling.

    Args:
        status: Run status string from the API.

    Returns:
        retryable: True while the run is still making progress.
    """
    return status in ("queued", "running")


if __name__ == "__main__":
    sys.exit(main())
