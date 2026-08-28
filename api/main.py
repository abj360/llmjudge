#!/usr/bin/env python3
"""
main.py --- FastAPI application exposing eval results

Contains:
    package_version(): the installed package version
    create_app(): builds the FastAPI app with all routers
    app: module-level ASGI application
"""

from importlib.metadata import PackageNotFoundError, version

from fastapi import FastAPI

from api.routes import compare, results, thresholds


def package_version() -> str:
    """Reads the installed package version, so /docs cannot claim a stale one.

    Returns:
        version: Installed llmjudge version, or "0+unknown" when not installed.
    """
    try:
        return version("llmjudge")
    except PackageNotFoundError:
        return "0+unknown"


def create_app() -> FastAPI:
    """Builds the FastAPI app with all routers.

    Returns:
        app: Configured FastAPI application.
    """
    app = FastAPI(title="llmjudge", version=package_version())
    app.include_router(results.router)
    app.include_router(compare.router)
    app.include_router(thresholds.router)
    return app


app = create_app()
