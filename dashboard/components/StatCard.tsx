#!/usr/bin/env ts-node
/**
 * StatCard.tsx --- one headline figure in the overview strip
 *
 * Contains:
 *   StatCard: renders a labelled figure with an optional note
 */

export default function StatCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "pass" | "below";
}) {
  /**
   * Renders one headline figure.
   *
   * @param props.label - What the figure measures.
   * @param props.value - The figure itself.
   * @param props.note - Optional supporting line.
   * @param props.tone - Optional colour for the value.
   * @returns card - Stat card element.
   */
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`value${tone ? ` delta-${tone === "pass" ? "up" : "down"}` : ""}`}>
        {value}
      </div>
      {note ? <div className="note">{note}</div> : null}
    </div>
  );
}
