/**
 * page.tsx --- trend view: metric score history per repo
 *
 * Contains:
 *   DEFAULT_METRIC: metric charted until one is chosen
 *   TrendsPage: renders a trend chart per repo against its own gate
 */

import TrendChart, { TrendLegend } from "../../components/TrendChart";
import { fetchMetricHistory, fetchRepos, fetchThresholds } from "../../lib/api";
import { formatScore, formatTimestamp } from "../../lib/format";
import { detectRegression, directionLabel } from "../../lib/trends";
import { thresholdFor } from "../../lib/gate";

const DEFAULT_METRIC = "faithfulness";

export default async function TrendsPage() {
  const [repos, thresholds] = await Promise.all([fetchRepos(), fetchThresholds()]);
  const series = await Promise.all(
    repos.map(async (repo) => ({
      repo,
      threshold: thresholdFor(thresholds, repo),
      points: await fetchMetricHistory(repo, DEFAULT_METRIC),
    })),
  );

  return (
    <>
      <div className="page-head">
        <h2>Regression trends</h2>
        <p>
          {DEFAULT_METRIC.replace(/_/g, " ")} across {series.length} repos, each against the
          threshold its own merge gate applies.
        </p>
      </div>

      {series.map(({ repo, threshold, points }) => {
        const latest = points[points.length - 1];
        const regressed = detectRegression(points, threshold);
        return (
          <article className="trend-card" key={repo}>
            <div className="trend-card-head">
              <h3>
                <a href={`/repos/${encodeURIComponent(repo)}`}>{repo}</a>
              </h3>
              <span className="meta">
                {latest ? formatScore(latest.score) : "—"} latest ·{" "}
                <span className={regressed ? "delta-down" : "delta-up"}>
                  {regressed ? "below gate" : directionLabel(points)}
                </span>
              </span>
            </div>
            <TrendChart points={points} threshold={threshold} />
            <div className="trend-axis">
              <span>{points[0] ? formatTimestamp(points[0].created_at) : ""}</span>
              <span>{latest ? formatTimestamp(latest.created_at) : ""}</span>
            </div>
          </article>
        );
      })}

      <TrendLegend />
    </>
  );
}
