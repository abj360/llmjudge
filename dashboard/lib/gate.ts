/**
 * gate.ts --- merge-gate arithmetic shared by every dashboard view
 *
 * Contains:
 *   Thresholds: the gate configuration the API serves
 *   Verdict: what the gate says about one run
 *   blendedScore(): mean of a run's metric scores
 *   thresholdFor(): the floor that applies to a repo
 *   verdictFor(): pass/below/pending for a set of scores
 *   marginFor(): signed distance from the floor
 */

export interface Thresholds {
  default: number;
  repos: Record<string, number>;
}

export type Verdict = "pass" | "below" | "pending";

export function blendedScore(scores: Record<string, number>): number {
  /**
   * Averages a run's metric scores, matching the gate's blended score.
   *
   * @param scores - Metric name to score in [0, 1].
   * @returns blended - Mean score, or 0 when the run has no scores.
   */
  const values = Object.values(scores);
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function thresholdFor(thresholds: Thresholds, repo: string): number {
  /**
   * Resolves the floor a repo has to clear.
   *
   * @param thresholds - Gate configuration from the API.
   * @param repo - Repo to resolve.
   * @returns threshold - The repo's override, else the default floor.
   */
  return thresholds.repos[repo] ?? thresholds.default;
}

export function verdictFor(
  thresholds: Thresholds,
  repo: string,
  scores: Record<string, number>,
): Verdict {
  /**
   * Decides what the gate says about one run.
   *
   * A run with no scores has not been judged yet, which is not the same as
   * failing, so it reports pending rather than being counted as below.
   *
   * @param thresholds - Gate configuration from the API.
   * @param repo - Repo the run belongs to.
   * @param scores - The run's metric scores.
   * @returns verdict - pass, below, or pending.
   */
  if (Object.keys(scores).length === 0) {
    return "pending";
  }
  return blendedScore(scores) >= thresholdFor(thresholds, repo) ? "pass" : "below";
}

export function marginFor(
  thresholds: Thresholds,
  repo: string,
  scores: Record<string, number>,
): number {
  /**
   * Measures how far a run sits from its floor.
   *
   * @param thresholds - Gate configuration from the API.
   * @param repo - Repo the run belongs to.
   * @param scores - The run's metric scores.
   * @returns margin - Blended score minus the floor; negative means below.
   */
  return blendedScore(scores) - thresholdFor(thresholds, repo);
}
