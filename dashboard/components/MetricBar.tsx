#!/usr/bin/env ts-node
/**
 * MetricBar.tsx --- one metric's score against the repo's floor
 *
 * Contains:
 *   MetricBar: renders a labelled bar with a threshold mark
 */

import { formatScore } from "../lib/format";

export default function MetricBar({
  name,
  score,
  threshold,
}: {
  name: string;
  score: number;
  threshold: number;
}) {
  /**
   * Renders one metric as a bar with the gate floor marked on it.
   *
   * @param props.name - Metric name.
   * @param props.score - Metric score in [0, 1].
   * @param props.threshold - Floor the repo has to clear.
   * @returns bar - Metric bar element.
   */
  const below = score < threshold;
  return (
    <div className="metric-bar">
      <span className="name">{name.replace(/_/g, " ")}</span>
      <span className="track">
        <span
          className={`fill${below ? " is-below" : ""}`}
          style={{ width: `${Math.round(score * 100)}%` }}
        />
        <span className="mark" style={{ left: `${Math.round(threshold * 100)}%` }} />
      </span>
      <span className="value">{formatScore(score)}</span>
    </div>
  );
}
