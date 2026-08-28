#!/usr/bin/env ts-node
/**
 * page.tsx --- dashboard home: every repo's standing against its merge gate
 *
 * Contains:
 *   RECENT_RUN_LIMIT: how many runs the activity table shows
 *   latestJudged(): the newest run of a repo that carries scores
 *   HomePage: renders the gate summary, repo cards, and recent activity
 */

import RepoCard from "../components/RepoCard";
import RunTable from "../components/RunTable";
import StatCard from "../components/StatCard";
import { fetchRepos, fetchRuns, fetchRun, fetchThresholds, type RunDetail } from "../lib/api";
import { blendedScore, thresholdFor, verdictFor, type Thresholds } from "../lib/gate";
import { formatScore } from "../lib/format";

const RECENT_RUN_LIMIT = 8;

async function latestJudged(repo: string): Promise<RunDetail | null> {
  /**
   * Finds the newest run of a repo that actually carries scores.
   *
   * The newest run may still be in flight, and an unscored run is not a
   * verdict, so the card reports the last run the judges finished.
   *
   * @param repo - Repo to look up.
   * @returns run - Newest scored run, or null when the repo has none.
   */
  const runs = await fetchRuns(repo);
  for (const summary of runs) {
    const detail = await fetchRun(summary.id);
    if (Object.keys(detail.scores ?? {}).length > 0) {
      return detail;
    }
  }
  return null;
}

export default async function HomePage() {
  const [repos, runs, thresholds] = await Promise.all([
    fetchRepos(),
    fetchRuns(),
    fetchThresholds(),
  ]);

  const cards = await Promise.all(
    repos.map(async (repo) => {
      const judged = await latestJudged(repo);
      const scores = judged?.scores ?? {};
      return {
        repo,
        scores,
        threshold: thresholdFor(thresholds as Thresholds, repo),
        verdict: verdictFor(thresholds as Thresholds, repo, scores),
        runCount: runs.filter((run) => run.repo === repo).length,
      };
    }),
  );

  const judgedCards = cards.filter((card) => card.verdict !== "pending");
  const passing = judgedCards.filter((card) => card.verdict === "pass").length;
  const meanBlended =
    judgedCards.length === 0
      ? 0
      : judgedCards.reduce((total, card) => total + blendedScore(card.scores), 0) /
        judgedCards.length;
  const failedRuns = runs.filter((run) => run.status === "failed").length;

  return (
    <>
      <div className="page-head">
        <h2>Evaluation gate</h2>
        <p>Where every repo stands against the threshold it has to clear to merge.</p>
      </div>

      <div className="stat-strip">
        <StatCard
          label="Repos gated"
          value={String(repos.length)}
          note="reading ci/thresholds.yaml"
        />
        <StatCard
          label="Clearing the gate"
          value={`${passing} / ${judgedCards.length}`}
          note={passing === judgedCards.length ? "all repos passing" : "some repos below threshold"}
          tone={passing === judgedCards.length ? "pass" : "below"}
        />
        <StatCard
          label="Mean blended"
          value={formatScore(meanBlended)}
          note="across the latest judged run per repo"
        />
        <StatCard
          label="Runs recorded"
          value={String(runs.length)}
          note={failedRuns > 0 ? `${failedRuns} failed to complete` : "none failed"}
        />
      </div>

      <h3 className="section-title">By repository</h3>
      <div className="repo-grid">
        {cards.map((card) => (
          <RepoCard
            key={card.repo}
            repo={card.repo}
            scores={card.scores}
            threshold={card.threshold}
            verdict={card.verdict}
            runCount={card.runCount}
          />
        ))}
      </div>

      <h3 className="section-title">Recent activity</h3>
      <RunTable runs={runs.slice(0, RECENT_RUN_LIMIT)} />
    </>
  );
}
