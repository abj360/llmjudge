/**
 * page.tsx --- trend view: metric score history per repo
 *
 * Contains:
 *   DEFAULT_METRIC: metric charted until one is chosen
 *   TrendsPage: renders a trend chart per repo with runs
 */

import TrendChart, { TrendLegend } from "../../components/TrendChart";
import { fetchMetricHistory, fetchRepos } from "../../lib/api";
import { detectRegression, directionLabel } from "../../lib/trends";

const DEFAULT_METRIC = "faithfulness";
const THRESHOLD = 0.8;

export default async function TrendsPage() {
  const repos = await fetchRepos();
  const series = await Promise.all(
    repos.map(async (repo) => ({
      repo,
      points: await fetchMetricHistory(repo, DEFAULT_METRIC),
    })),
  );

  return (
    <section>
      <h2>Regression trends</h2>
      <p>
        {DEFAULT_METRIC} across {series.length} repos
      </p>
      {series.map(({ repo, points }) => (
        <article key={repo}>
          <h3>
            {repo} — {directionLabel(points)}
            {detectRegression(points, THRESHOLD) ? " (below threshold)" : ""}
          </h3>
          <TrendChart points={points} threshold={THRESHOLD} />
        </article>
      ))}
      <TrendLegend />
    </section>
  );
}
