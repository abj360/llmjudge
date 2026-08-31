#!/usr/bin/env ts-node
/**
 * trends.ts --- trend aggregation helpers for regression charts
 *
 * Contains:
 *   movingAverage: smooths a score series over a window
 *   trendDirection: labels a series improving, flat, or regressing
 */

import type { TrendPoint } from "../components/TrendChart";
import { median } from "./stats";

/**
 * Smooths a score series over a window.
 *
 * @param points - Score points oldest-first.
 * @param windowSize - Number of points per window.
 * @returns smoothed - Moving-average series aligned to the input tail.
 */
export function movingAverage(points: TrendPoint[], windowSize: number): number[] {
  const scores = points.map((point) => point.score);
  const result: number[] = [];
  for (let index = windowSize - 1; index < scores.length; index += 1) {
    const window = scores.slice(index - windowSize + 1, index + 1);
    result.push(window.reduce((sum, value) => sum + value, 0) / windowSize);
  }
  return result;
}

/**
 * Computes the score delta between the two newest points.
 *
 * @param points - Score points oldest-first.
 * @returns delta - Change from the previous point; 0 with fewer than two.
 */
export function latestDelta(points: TrendPoint[]): number {
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  if (last === undefined || prev === undefined) {
    return 0;
  }
  return last.score - prev.score;
}

/**
 * Labels a series as improving, flat, or regressing.
 *
 * @param points - Score points oldest-first.
 * @returns result - See description.
 */
export function trendDirection(points: TrendPoint[]): "improving" | "flat" | "regressing" {
  const delta = latestDelta(points);
  if (Math.abs(delta) < 0.005) {
    return "flat";
  }
  return delta > 0 ? "improving" : "regressing";
}

/**
 * Flags when the newest point drops below the threshold.
 *
 * @param points - Score points oldest-first.
 * @param threshold - Pass threshold.
 * @returns regressed - True only when there is a point and it is below.
 */
export function detectRegression(points: TrendPoint[], threshold: number): boolean {
  const last = points[points.length - 1];
  return last !== undefined && last.score < threshold;
}

/**
 * Counts points strictly below the threshold.
 *
 * @param points - Score points oldest-first.
 * @param threshold - Pass threshold.
 * @returns count - Number of failing points.
 */
export function failureCount(points: TrendPoint[], threshold: number): number {
  return points.filter((point) => point.score < threshold).length;
}

/**
 * Finds the index of the newest point above the threshold.
 *
 * @param points - Score points oldest-first.
 * @param threshold - Pass threshold.
 * @returns index - Zero-based index, or -1 when none pass.
 */
export function lastPassingIndex(points: TrendPoint[], threshold: number): number {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point !== undefined && point.score >= threshold) {
      return index;
    }
  }
  return -1;
}

/**
 * Averages all point scores into a single figure.
 *
 * @param points - Score points oldest-first.
 * @returns result - See description.
 */
export function bucketAverage(points: TrendPoint[]): number {
  const total = points.reduce((sum, point) => sum + point.score, 0);
  return points.length === 0 ? 0 : total / points.length;
}

/**
 * Clamps a score into the renderable range.
 *
 * @param score - Raw score, possibly out of range.
 * @returns clamped - Score bounded to [0, 1].
 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(1, score));
}

/**
 * Splits a series into passing and failing points.
 *
 * @param points - Score points oldest-first.
 * @param threshold - Pass threshold.
 * @returns groups - Passing and failing sub-lists.
 */
export function partitionByThreshold(
  points: TrendPoint[],
  threshold: number,
): { passing: TrendPoint[]; failing: TrendPoint[] } {
  return {
    passing: points.filter((point) => point.score >= threshold),
    failing: points.filter((point) => point.score < threshold),
  };
}

/**
 * Finds the lowest score in the series.
 *
 * @param points - Score points oldest-first.
 * @returns result - See description.
 */
export function minScore(points: TrendPoint[]): number {
  return Math.min(...points.map((point) => point.score));
}

/**
 * Finds the highest score in the series.
 *
 * @param points - Score points oldest-first.
 * @returns result - See description.
 */
export function maxScore(points: TrendPoint[]): number {
  return Math.max(...points.map((point) => point.score));
}

/**
 * Measures score spread as max minus min.
 *
 * @param points - Score points oldest-first.
 * @returns result - See description.
 */
export function volatility(points: TrendPoint[]): number {
  return maxScore(points) - minScore(points);
}

/**
 * Counts points at or above the threshold.
 *
 * @param points - Score points oldest-first.
 * @param threshold - Pass threshold.
 * @returns count - Number of passing points.
 */
export function passCount(points: TrendPoint[], threshold: number): number {
  return points.filter((point) => point.score >= threshold).length;
}

/**
 * Computes the standard deviation of the series.
 *
 * @param points - Score points oldest-first.
 * @returns sd - Population standard deviation; 0 for an empty series.
 */
export function scoreStdDev(points: TrendPoint[]): number {
  if (points.length === 0) {
    return 0;
  }
  const mean = bucketAverage(points);
  const variance =
    points.reduce((sum, point) => sum + (point.score - mean) ** 2, 0) / points.length;
  return Math.sqrt(variance);
}

/**
 * Normalizes scores into 0-100 bar heights for rendering.
 *
 * @param points - Score points oldest-first.
 * @returns result - See description.
 */
export function sparklinePoints(points: TrendPoint[]): number[] {
  return points.map((point) => Math.round(point.score * 100));
}

/**
 * Counts trailing points below the threshold.
 *
 * @param points - Score points oldest-first.
 * @returns result - See description.
 */
export function consecutiveFailures(points: TrendPoint[], threshold: number): number {
  let count = 0;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point === undefined || point.score >= threshold) {
      break;
    }
    count += 1;
  }
  return count;
}

/**
 * Slices the series down to the newest N points.
 *
 * @param points - Score points oldest-first.
 * @returns result - See description.
 */
export function windowedSeries(points: TrendPoint[], size: number): TrendPoint[] {
  return points.slice(-size);
}

/**
 * Computes the mean of the newest window of points.
 *
 * @param points - Score points oldest-first.
 * @param size - Window size.
 * @returns mean - Window mean; 0 for an empty window.
 */
export function recentMean(points: TrendPoint[], size: number): number {
  const window = points.slice(-size);
  if (window.length === 0) {
    return 0;
  }
  return window.reduce((sum, point) => sum + point.score, 0) / window.length;
}

/**
 * Formats a trend direction label for display.
 *
 * @param points - Score points oldest-first.
 * @returns label - Capitalized direction label.
 */
export function directionLabel(points: TrendPoint[]): string {
  const direction = trendDirection(points);
  return direction.charAt(0).toUpperCase() + direction.slice(1);
}

/**
 * Computes the median score of the series.
 *
 * @param points - Score points oldest-first.
 * @returns median - Median score; 0 for an empty series.
 */
export function medianScore(points: TrendPoint[]): number {
  return median(points.map((point) => point.score));
}

/**
 * Picks the worst point in the series.
 *
 * @param points - Score points oldest-first.
 * @returns point - Lowest-scoring point.
 */
export function worstPoint(points: TrendPoint[]): TrendPoint {
  return points.reduce((worst, point) => (point.score < worst.score ? point : worst));
}
