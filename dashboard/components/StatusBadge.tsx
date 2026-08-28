#!/usr/bin/env ts-node
/**
 * StatusBadge.tsx --- run lifecycle status with a colour-coded dot
 *
 * Contains:
 *   KNOWN: statuses that get their own colour
 *   StatusBadge: renders one run status
 */

const KNOWN = new Set(["queued", "running", "succeeded", "failed"]);

export default function StatusBadge({ status }: { status: string }) {
  /**
   * Renders a run status as a dot and label.
   *
   * @param props.status - Run status string.
   * @returns badge - Status element.
   */
  const known = KNOWN.has(status) ? status : "queued";
  return (
    <span className={`status-badge ${known}`}>
      <span className="dot" />
      {status}
    </span>
  );
}
