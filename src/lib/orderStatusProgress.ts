const ORDER_STATUS_RANK: Record<string, number> = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  COMPLETED: 4,
};

/** Ignore stale responses/events so the guest timeline can only move forward. */
export function canApplyOrderStatus(current: string, next: string): boolean {
  if (current === next) return true;
  if (current === "CANCELLED" || current === "COMPLETED") return false;
  if (next === "CANCELLED") return true;

  const nextRank = ORDER_STATUS_RANK[next];
  if (nextRank === undefined) return false;
  const currentRank = ORDER_STATUS_RANK[current];
  return currentRank === undefined || nextRank > currentRank;
}
