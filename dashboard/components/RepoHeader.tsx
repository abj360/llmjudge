#!/usr/bin/env ts-node
/**
 * RepoHeader.tsx --- heading for one repo's drill-down
 *
 * Contains:
 *   RepoHeader: renders the repo name, run count, and gate verdict
 */

import GateBadge from "./GateBadge";
import type { Verdict } from "../lib/gate";

export default function RepoHeader({
  name,
  runCount,
  threshold,
  verdict,
}: {
  name: string;
  runCount: number;
  threshold: number;
  verdict: Verdict;
}) {
  /**
   * Renders the drill-down heading.
   *
   * @param props.name - Repo name.
   * @param props.runCount - Runs recorded for the repo.
   * @param props.threshold - Floor the repo has to clear.
   * @param props.verdict - What the gate decided on the latest judged run.
   * @returns header - Repo header element.
   */
  return (
    <header className="repo-header">
      <div>
        <a className="back-link" href="/">
          ← all repos
        </a>
        <h2>{name}</h2>
        <div className="sub">
          {runCount} runs · merge gate {threshold.toFixed(2)}
        </div>
      </div>
      <GateBadge verdict={verdict} />
    </header>
  );
}
