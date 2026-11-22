import { describe, expect, it } from "vitest";
import { canApplyOrderStatus } from "@/lib/orderStatusProgress";

describe("guest order status progression", () => {
  it("accepts forward updates and duplicate snapshots", () => {
    expect(canApplyOrderStatus("NEW", "ACCEPTED")).toBe(true);
    expect(canApplyOrderStatus("PREPARING", "COMPLETED")).toBe(true);
    expect(canApplyOrderStatus("READY", "READY")).toBe(true);
  });

  it("ignores stale updates that would move the timeline backwards", () => {
    expect(canApplyOrderStatus("COMPLETED", "NEW")).toBe(false);
    expect(canApplyOrderStatus("READY", "PREPARING")).toBe(false);
  });

  it("keeps terminal states terminal while allowing an active order to cancel", () => {
    expect(canApplyOrderStatus("ACCEPTED", "CANCELLED")).toBe(true);
    expect(canApplyOrderStatus("CANCELLED", "COMPLETED")).toBe(false);
    expect(canApplyOrderStatus("COMPLETED", "CANCELLED")).toBe(false);
    expect(canApplyOrderStatus("NEW", "UNKNOWN")).toBe(false);
  });
});
