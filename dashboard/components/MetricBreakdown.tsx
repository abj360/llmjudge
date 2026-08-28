#!/usr/bin/env ts-node
/**
 * MetricBreakdown.tsx --- every metric of a run against the repo's floor
 *
 * Contains:
 *   MetricBreakdown: renders one bar per metric
 */

import EmptyState from "./EmptyState";
import MetricBar from "./MetricBar";

export default function MetricBreakdown({
  scores,
  threshold,
}: {
  scores: Record<string, number>;
  threshold: number;
}) {
  /**
   * Renders one bar per metric, sorted worst-first so a regression leads.
   *
   * @param props.scores - Metric name to score.
   * @param props.threshold - Floor the repo has to clear.
   * @returns breakdown - Metric bar list, or an empty state.
   */
  const entries = Object.entries(scores).sort((left, right) => left[1] - right[1]);
  if (entries.length === 0) {
    return <EmptyState message="This run has not been scored yet" />;
  }
  return (
    <div className="repo-card-metrics">
      {entries.map(([name, score]) => (
        <MetricBar key={name} name={name} score={score} threshold={threshold} />
      ))}
    </div>
  );
}
