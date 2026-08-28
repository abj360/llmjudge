#!/usr/bin/env ts-node
/**
 * GateBadge.tsx --- pill stating what the merge gate says about a run
 *
 * Contains:
 *   LABELS: wording per verdict
 *   GateBadge: renders one verdict
 */

import type { Verdict } from "../lib/gate";

const LABELS: Record<Verdict, string> = {
  pass: "passing",
  below: "below gate",
  pending: "not judged",
};

export default function GateBadge({ verdict }: { verdict: Verdict }) {
  /**
   * Renders a gate verdict as a coloured pill.
   *
   * @param props.verdict - What the gate decided.
   * @returns badge - Pill element.
   */
  return <span className={`gate-badge ${verdict}`}>{LABELS[verdict]}</span>;
}
