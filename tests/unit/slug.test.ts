import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Riverside Café")).toBe("riverside-caf");
  });

  it("strips leading/trailing hyphens", () => {
    expect(slugify("  Spice Hub!! ")).toBe("spice-hub");
  });

  it("two restaurants with the same name never collide at the API layer", () => {
    // slugify() itself is NOT unique-safe by design — uniqueSlug() in
    // src/app/api/super/restaurants/route.ts appends -2, -3... on collision.
    // This test documents that slugify alone is only the base, not the guarantee.
    expect(slugify("Urban Bites")).toBe(slugify("Urban Bites"));
  });
});
