#!/usr/bin/env ts-node
/**
 * RunCompare.tsx --- side-by-side run comparison view
 *
 * Contains:
 *   RunCompare: renders two runs' scores side by side with deltas
 */

import { formatScore, formatTimestamp } from "../lib/format";

export interface ComparePayload {
  base: string;
  candidate: string;
  deltas: Record<string, number>;
  regressions: string[];
}

/**
 * Renders two runs' scores side by side with deltas.
 *
 * @param props.payload - Comparison payload from the API.
 * @returns view - Comparison view element.
 */
export default function RunCompare({ payload }: { payload: ComparePayload }) {
  return (
    <section className="run-compare">
      <h2>
        Comparing {payload.base} → {payload.candidate}
      </h2>
      <table className="compare-table">
        <caption>per-metric score deltas</caption>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Delta</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(payload.deltas).map(([metric, delta]) => (
            <tr
              key={metric}
              className={delta < 0 ? "delta-down" : "delta-up"}
              aria-label={payload.regressions.includes(metric) ? "regression" : undefined}
            >
              <td>{metric}</td>
              <td>
                {delta > 0 ? "+" : "-"}
                {formatScore(Math.abs(delta))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {payload.regressions.length > 0 && (
        <p className="regression-note">regressions: {payload.regressions.join(", ")}</p>
      )}
    </section>
  );
}
