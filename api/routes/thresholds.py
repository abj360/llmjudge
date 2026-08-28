#!/usr/bin/env python3
"""
thresholds.py --- routes exposing the merge-gate thresholds

Contains:
    router: APIRouter with the thresholds endpoint
    ThresholdsResponse: the resolved gate configuration
    get_thresholds(): serves the thresholds the merge gate enforces
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ci.check_thresholds import load_threshold_config

router = APIRouter(tags=["thresholds"])


class ThresholdsResponse(BaseModel):
    """The blended-score floors the merge gate applies.

    Attributes:
        default: Floor applied to any repo without its own entry.
        repos: Per-repo overrides, keyed by repo name.
    """

    default: float
    repos: dict[str, float]


@router.get("/thresholds", response_model=ThresholdsResponse)
def get_thresholds() -> ThresholdsResponse:
    """Serves the thresholds the merge gate enforces.

    The dashboard marks a run as regressed against these, so reading them from
    the same config the gate reads keeps the two from disagreeing.

    Returns:
        thresholds: Default floor plus every per-repo override.

    Raises:
        HTTPException: 503 when the config cannot be read.
    """
    try:
        config = load_threshold_config()
    except (OSError, KeyError, ValueError) as error:
        raise HTTPException(status_code=503, detail=f"thresholds unavailable: {error}") from error
    repos = {name: float(entry["threshold"]) for name, entry in config.get("repos", {}).items()}
    return ThresholdsResponse(default=float(config["default_threshold"]), repos=repos)
