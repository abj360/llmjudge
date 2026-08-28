#!/usr/bin/env ts-node
/**
 * RunTable.tsx --- recent runs across every repo
 *
 * Contains:
 *   RunTable: renders run summaries as a table
 */

import type { RunSummary } from "../lib/api";
import EmptyState from "./EmptyState";
import StatusBadge from "./StatusBadge";
import { formatTimestamp } from "../lib/format";

export default function RunTable({ runs }: { runs: RunSummary[] }) {
  /**
   * Renders run summaries newest-first.
   *
   * @param props.runs - Run summaries to render.
   * @returns table - Runs table element.
   */
  if (runs.length === 0) {
    return <EmptyState message="No runs recorded yet" />;
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Run</th>
          <th>Repo</th>
          <th>Status</th>
          <th className="num">Recorded</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id}>
            <td className="run-id">{run.id}</td>
            <td>
              <a href={`/repos/${encodeURIComponent(run.repo)}`}>{run.repo}</a>
            </td>
            <td>
              <StatusBadge status={run.status} />
            </td>
            <td className="num muted">{formatTimestamp(run.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
