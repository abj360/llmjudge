#!/usr/bin/env ts-node
/**
 * repos.ts --- helpers for the per-repo drill-down view
 *
 * Contains:
 *   REPOS: repos tracked by the dashboard
 *   filterByStatus: filters runs by status
 */

import { median } from "./stats";
import type { RunSummary } from "./api";

export const REPOS = ["retrieval-core", "agentflow", "graphmind", "llmjudge", "shipwright"];

/**
 * Filters runs by status.
 *
 * @param runs - Runs to filter.
 * @param status - Status to keep; null keeps everything.
 * @returns filtered - Runs matching the status.
 */
export function filterByStatus(runs: RunSummary[], status: string | null): RunSummary[] {
  if (status === null) {
    return runs;
  }
  return runs.filter((run) => run.status === status);
}

/**
 * Counts runs per status for the filter bar badges.
 *
 * @param runs - Runs to count.
 * @returns counts - Mapping of status to run count.
 */
export function countByStatus(runs: RunSummary[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const run of runs) {
    counts[run.status] = (counts[run.status] ?? 0) + 1;
  }
  return counts;
}

/**
 * Filters runs to those created on or after a date.
 *
 * @param runs - Runs to filter.
 * @param sinceIso - ISO date lower bound.
 * @returns filtered - Runs created at or after the bound.
 */
export function sinceDate(runs: RunSummary[], sinceIso: string): RunSummary[] {
  return runs.filter((run) => run.created_at >= sinceIso);
}

/**
 * Filters runs to those created before a date.
 *
 * @param runs - Runs to filter.
 * @param untilIso - ISO date upper bound.
 * @returns filtered - Runs created before the bound.
 */
export function untilDate(runs: RunSummary[], untilIso: string): RunSummary[] {
  return runs.filter((run) => run.created_at < untilIso);
}

/**
 * Chains status and date filters into one pass.
 *
 * @param runs - Runs to filter.
 * @param status - Status to keep; null keeps everything.
 * @param sinceIso - Optional ISO lower bound.
 * @returns filtered - Runs matching every active filter.
 */
export function applyFilters(
  runs: RunSummary[],
  status: string | null,
  sinceIso?: string,
): RunSummary[] {
  let filtered = filterByStatus(runs, status);
  if (sinceIso) {
    filtered = sinceDate(filtered, sinceIso);
  }
  return filtered;
}

/**
 * Lists the distinct statuses present in a run list.
 *
 * @param runs - Runs to inspect.
 * @returns statuses - Sorted distinct status strings.
 */
export function statusesOf(runs: RunSummary[]): string[] {
  return [...new Set(runs.map((run) => run.status))].sort();
}

/**
 * Counts runs created per calendar day.
 *
 * @param runs - Runs to bucket.
 * @returns counts - Mapping of ISO date to run count.
 */
export function runsPerDay(runs: RunSummary[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const run of runs) {
    const day = run.created_at.slice(0, 10);
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return counts;
}

/**
 * Picks the display name for a repo slug.
 *
 * @param slug - Repo slug from the URL.
 * @returns name - Display name.
 */
export function displayName(slug: string): string {
  return slug.replace(/-/g, " ");
}

/**
 * Validates that a slug is a known repo.
 *
 * @param slug - Repo slug from the URL.
 * @returns known - True when the slug is tracked.
 */
export function isKnownRepo(slug: string): boolean {
  return REPOS.includes(slug);
}

/**
 * Sorts runs newest-first by creation timestamp.
 *
 * @param runs - Runs to sort.
 * @returns sorted - Newly sorted array; input is not mutated.
 */
export function sortNewestFirst(runs: RunSummary[]): RunSummary[] {
  return [...runs].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/**
 * Finds runs whose id contains a search fragment.
 *
 * @param runs - Runs to search.
 * @param fragment - Substring to match against run ids.
 * @returns matches - Runs whose id contains the fragment.
 */
export function searchRuns(runs: RunSummary[], fragment: string): RunSummary[] {
  return runs.filter((run) => run.id.includes(fragment));
}

/**
 * Finds the most recent failed run in a list.
 *
 * @param runs - Runs to search.
 * @returns run - Newest failed run, or undefined.
 */
export function latestFailure(runs: RunSummary[]): RunSummary | undefined {
  return sortNewestFirst(runs).find((run) => run.status === "failed");
}

/**
 * Groups runs by their repo field.
 *
 * @param runs - Runs to group.
 * @returns grouped - Mapping of repo name to its runs.
 */
export function groupByRepo(runs: RunSummary[]): Record<string, RunSummary[]> {
  const grouped: Record<string, RunSummary[]> = {};
  for (const run of runs) {
    grouped[run.repo] = [...(grouped[run.repo] ?? []), run];
  }
  return grouped;
}

/**
 * Computes the share of succeeded runs.
 *
 * @param runs - Runs to measure.
 * @returns rate - Success rate in [0, 1]; 1 for an empty list.
 */
export function successRate(runs: RunSummary[]): number {
  if (runs.length === 0) {
    return 1;
  }
  const succeeded = runs.filter((run) => run.status === "succeeded").length;
  return succeeded / runs.length;
}

/**
 * Builds the drill-down page title for a repo.
 *
 * @param repo - Repo name.
 * @returns title - Page title string.
 */
export function repoTitle(repo: string): string {
  return `llmjudge / ${repo}`;
}

/**
 * Computes the median run count across repos.
 *
 * @param grouped - Runs grouped by repo.
 * @returns median - Median run count.
 */
export function medianRunCount(grouped: Record<string, RunSummary[]>): number {
  const counts = Object.values(grouped)
    .map((runs) => runs.length)
    .sort((a, b) => a - b);
  return median(counts);
}
