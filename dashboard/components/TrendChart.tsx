#!/usr/bin/env ts-node
/**
 * TrendChart.tsx --- score history for one repo and metric
 *
 * Contains:
 *   TrendPoint: one dated score
 *   TrendChart: renders the history as bars against the gate floor
 *   TrendLegend: renders the pass/below key
 */

import { formatScore } from "../lib/format";

export interface TrendPoint {
  created_at: string;
  score: number;
}

const FLOOR = 0.5;

export default function TrendChart({
  points,
  threshold,
  height = 8.5,
}: {
  points: TrendPoint[];
  threshold: number;
  height?: number;
}) {
  /**
   * Renders score history as bars with the gate floor drawn across them.
   *
   * Bars are scaled from FLOOR rather than zero: every score sits in the top
   * half of the range, so a full-height axis flattens the differences that
   * matter.
   *
   * @param props.points - Score points oldest-first.
   * @param props.threshold - Floor the repo has to clear.
   * @param props.height - Chart height in rem.
   * @returns chart - Trend chart element.
   */
  const scale = (score: number) => Math.max(0, (score - FLOOR) / (1 - FLOOR)) * 100;
  return (
    <div className="trend-chart" style={{ height: `${height}rem` }}>
      <div className="trend-threshold" style={{ bottom: `${scale(threshold)}%` }}>
        <span>gate {threshold.toFixed(2)}</span>
      </div>
      {points.map((point, index) => (
        <div
          key={index}
          className={point.score >= threshold ? "bar bar-pass" : "bar bar-fail"}
          style={{ height: `${scale(point.score)}%` }}
          title={`${point.created_at}: ${formatScore(point.score)}`}
        />
      ))}
    </div>
  );
}

export function TrendLegend() {
  /**
   * Renders the pass/below key shown under the charts.
   *
   * @returns legend - Legend element.
   */
  return (
    <div className="trend-legend">
      <span>
        <span className="swatch bar-pass" />
        at or above the gate
      </span>
      <span>
        <span className="swatch bar-fail" />
        below the gate
      </span>
    </div>
  );
}
