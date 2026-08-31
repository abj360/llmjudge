#!/usr/bin/env python3
"""
deps.py --- dependency providers for the results API

Contains:
    get_store(): provides the ResultsStore for request handlers
"""

import os

from store.results_store import ResultsStore

DEFAULT_DSN = "postgresql://llmjudge:llmjudge@localhost:5432/llmjudge"


def get_store() -> ResultsStore:
    """Provides the ResultsStore for request handlers.

    Returns:
        store: ResultsStore built from DATABASE_URL.
    """
    return ResultsStore(os.environ.get("DATABASE_URL", DEFAULT_DSN))
