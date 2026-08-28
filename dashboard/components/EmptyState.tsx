#!/usr/bin/env ts-node
/**
 * EmptyState.tsx --- placeholder shown when a view has nothing to render
 *
 * Contains:
 *   EmptyState: renders a muted message
 */

export default function EmptyState({ message }: { message: string }) {
  /**
   * Renders a placeholder message.
   *
   * @param props.message - What is missing.
   * @returns element - Empty state element.
   */
  return <p className="empty-state">{message}</p>;
}
