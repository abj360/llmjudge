#!/usr/bin/env ts-node
/**
 * RepoCard.tsx --- one repo's standing against its merge gate
 *
 * Contains:
 *   RepoCard: renders a repo's blended score, verdict, and metric bars
 */

import GateBadge from "./GateBadge";
import MetricBar from "./MetricBar";
import { formatScore } from "../lib/format";
import { blendedScore, type Verdict } from "../lib/gate";

export default function RepoCard({
  repo,
  scores,
  threshold,
  verdict,
  runCount,
}: {
  repo: string;
  scores: Record<string, number>;
  threshold: number;
  verdict: Verdict;
  runCount: number;
}) {
  /**
   * Renders one repo's latest judged run against its floor.
   *
   * @param props.repo - Repo name.
   * @param props.scores - Latest judged run's metric scores.
   * @param props.threshold - Floor the repo has to clear.
   * @param props.verdict - What the gate decided.
   * @param props.runCount - Runs recorded for the repo.
   * @returns card - Repo card linking to the drill-down.
   */
  const blended = blendedScore(scores);
  const margin = blended - threshold;
  const entries = Object.entries(scores).sort((left, right) => left[1] - right[1]);
  return (
    <a className={`repo-card is-${verdict}`} href={`/repos/${encodeURIComponent(repo)}`}>
      <div className="repo-card-head">
        <h3>{repo}</h3>
        <GateBadge verdict={verdict} />
      </div>
      <div className="repo-card-score">
        <span className="blended">{formatScore(blended)}</span>
        <span className="against">gate {threshold.toFixed(2)}</span>
      </div>
      <div className={`repo-card-margin ${margin >= 0 ? "delta-up" : "delta-down"}`}>
        {margin >= 0 ? "+" : ""}
        {margin.toFixed(3)} against gate · <span className="muted">{runCount} runs</span>
      </div>
      <div className="repo-card-metrics">
        {entries.map(([name, score]) => (
          <MetricBar key={name} name={name} score={score} threshold={threshold} />
        ))}
      </div>
    </a>
  );
}
