#!/usr/bin/env ts-node
/**
 * DrillDownTable.tsx --- one repo's run history with its blended scores
 *
 * Contains:
 *   DrillDownTable: renders runs with blended score and gate outcome
 */

import type { RunDetail } from "../lib/api";
import EmptyState from "./EmptyState";
import GateBadge from "./GateBadge";
import StatusBadge from "./StatusBadge";
import { formatScore, formatTimestamp } from "../lib/format";
import { blendedScore, verdictFor, type Thresholds } from "../lib/gate";

export default function DrillDownTable({
  runs,
  repo,
  thresholds,
}: {
  runs: RunDetail[];
  repo: string;
  thresholds: Thresholds;
}) {
  /**
   * Renders a repo's runs with what the gate made of each.
   *
   * @param props.runs - Runs with scores, newest-first.
   * @param props.repo - Repo the runs belong to.
   * @param props.thresholds - Gate configuration from the API.
   * @returns table - Run history table element.
   */
  if (runs.length === 0) {
    return <EmptyState message="No runs recorded for this repo" />;
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Run</th>
          <th>Status</th>
          <th className="num">Blended</th>
          <th>Gate</th>
          <th className="num">Recorded</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => {
          const scores = run.scores ?? {};
          const scored = Object.keys(scores).length > 0;
          return (
            <tr key={run.id}>
              <td className="run-id">{run.id}</td>
              <td>
                <StatusBadge status={run.status} />
              </td>
              <td className="num">{scored ? formatScore(blendedScore(scores)) : "—"}</td>
              <td>
                <GateBadge verdict={verdictFor(thresholds, repo, scores)} />
              </td>
              <td className="num muted">{formatTimestamp(run.created_at)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
