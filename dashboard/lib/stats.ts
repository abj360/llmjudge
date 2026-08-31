/**
 * stats.ts --- summary statistics shared by the trend and repo helpers
 *
 * Contains:
 *   median: middle value of a numeric series
 */

/**
 * Computes the median of a numeric series.
 *
 * @param values - Numbers to summarise; sorted in place by the caller or not.
 * @returns median - Middle value, the mean of the middle pair when even,
 *   and 0 for an empty series.
 */
export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid];
  if (upper === undefined) {
    return 0;
  }
  if (sorted.length % 2 !== 0) {
    return upper;
  }
  const lower = sorted[mid - 1];
  return lower === undefined ? upper : (lower + upper) / 2;
}
