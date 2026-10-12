import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rateLimit";

describe("checkRateLimit", () => {
  it("allows the first request and blocks the second within the window", () => {
    const key = `test-${Date.now()}-a`;
    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(false);
  });

  it("never shares a bucket between two different keys (tenant isolation)", () => {
    const restaurantAKey = `order:restaurant-A:table-1-${Date.now()}`;
    const restaurantBKey = `order:restaurant-B:table-1-${Date.now()}`;

    expect(checkRateLimit(restaurantAKey, 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(restaurantAKey, 1, 60_000).allowed).toBe(false); // A is now limited

    // B must be completely unaffected by A being limited — this is the
    // automated version of the "one restaurant can't affect another" claim.
    expect(checkRateLimit(restaurantBKey, 1, 60_000).allowed).toBe(true);
  });
});
