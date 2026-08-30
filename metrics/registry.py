#!/usr/bin/env python3
"""
registry.py --- metric name to class registry used by the runner and API

Contains:
    METRIC_REGISTRY: mapping of metric names to their classes
    build_metric(): instantiates a metric by name with defaults
"""

from metrics.agent_trajectory import AgentTrajectoryMetric
from metrics.answer_relevancy import AnswerRelevancyMetric
from metrics.base import BaseMetric
from metrics.contextual_precision_recall import (
    ContextualPrecisionMetric,
    ContextualRecallMetric,
)
from metrics.faithfulness import FaithfulnessMetric
from metrics.g_eval import GEvalMetric
from metrics.hallucination import HallucinationMetric

METRIC_REGISTRY: dict[str, type[BaseMetric]] = {
    "faithfulness": FaithfulnessMetric,
    "answer_relevancy": AnswerRelevancyMetric,
    "contextual_precision": ContextualPrecisionMetric,
    "contextual_recall": ContextualRecallMetric,
    "hallucination": HallucinationMetric,
    "agent_trajectory": AgentTrajectoryMetric,
    "g_eval": GEvalMetric,
}


def build_metric(name: str, **kwargs: object) -> BaseMetric:
    """Instantiates a metric by registry name.

    Args:
        name: Registry key of the metric.
        **kwargs: Constructor arguments for the metric.

    Returns:
        metric: Instantiated metric.

    Raises:
        KeyError: When the name is not in the registry.
    """
    if name not in METRIC_REGISTRY:
        raise KeyError(f"unknown metric: {name}")
    metric_cls: type[BaseMetric] = METRIC_REGISTRY[name]
    return metric_cls(**kwargs)
