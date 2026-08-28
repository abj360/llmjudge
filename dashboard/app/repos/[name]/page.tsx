#!/usr/bin/env ts-node
/**
 * page.tsx --- per-repo drill-down view
 *
 * Contains:
 *   RepoPage: renders one repo's gate standing, metric breakdown, and history
 */

import DrillDownTable from "../../../components/DrillDownTable";
import MetricBreakdown from "../../../components/MetricBreakdown";
import RepoHeader from "../../../components/RepoHeader";
import { fetchRun, fetchRuns, fetchThresholds, type RunDetail } from "../../../lib/api";
import { sortNewestFirst } from "../../../lib/repos";
import { thresholdFor, verdictFor } from "../../../lib/gate";

export default async function RepoPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const [summaries, thresholds] = await Promise.all([fetchRuns(name), fetchThresholds()]);
  const sorted = sortNewestFirst(summaries);
  const runs: RunDetail[] = await Promise.all(sorted.map((run) => fetchRun(run.id)));
  const judged = runs.find((run) => Object.keys(run.scores ?? {}).length > 0);
  const scores = judged?.scores ?? {};
  const threshold = thresholdFor(thresholds, name);

  return (
    <>
      <RepoHeader
        name={name}
        runCount={runs.length}
        threshold={threshold}
        verdict={verdictFor(thresholds, name, scores)}
      />

      <h3 className="section-title">Latest judged run{judged ? ` — ${judged.id}` : ""}</h3>
      <div className="panel">
        <MetricBreakdown scores={scores} threshold={threshold} />
      </div>

      <h3 className="section-title">Run history</h3>
      <DrillDownTable runs={runs} repo={name} thresholds={thresholds} />
    </>
  );
}
