#!/usr/bin/env ts-node
/**
 * api.ts --- typed client for the llmjudge results API
 *
 * Contains:
 *   API_BASE: absolute base the API is reached on
 *   getJson: fetches and decodes one path, failing on a non-2xx
 *   fetchRuns: lists recent runs from the API
 *   fetchRun: fetches one run with scores
 *   fetchRepos: lists repos that have runs
 */

export interface RunSummary {
  id: string;
  repo: string;
  status: string;
  created_at: string;
}

export interface RunDetail extends RunSummary {
  scores: Record<string, number>;
}

// Server components fetch during render, where a relative path has no origin
// to resolve against, so the base has to be absolute. In the browser the Next
// rewrite still forwards /api, which is what NEXT_PUBLIC_API_BASE defaults to.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? process.env.LLMJUDGE_API_URL ?? "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  /**
   * Fetches one API path and decodes it, refusing anything but a 2xx.
   *
   * A failed request must not be decoded as though it succeeded: an error body
   * would otherwise reach the table as if it were data.
   *
   * @param path - Path below the API base, starting with a slash.
   * @returns body - Decoded JSON response.
   */
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`llmjudge api ${path} answered ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * Lists recent runs from the API.
 *
 * @param repo - Optional repo filter.
 * @returns runs - Run summaries newest-first.
 */
export async function fetchRuns(repo?: string): Promise<RunSummary[]> {
  const query = repo ? `?repo=${encodeURIComponent(repo)}` : "";
  return getJson<RunSummary[]>(`/runs${query}`);
}

/**
 * Fetches one run with its scores.
 *
 * @param runId - Run identifier.
 * @returns run - Run payload with scores.
 */
export async function fetchRun(runId: string): Promise<RunDetail> {
  return getJson<RunDetail>(`/runs/${encodeURIComponent(runId)}`);
}

/**
 * Lists repos that have at least one stored run.
 *
 * @returns repos - Sorted distinct repo names.
 */
export async function fetchRepos(): Promise<string[]> {
  return getJson<string[]>("/repos");
}
