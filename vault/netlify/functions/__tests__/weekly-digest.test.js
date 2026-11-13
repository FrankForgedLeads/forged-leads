import { describe, it, expect } from "vitest";
import { buildDigestHtml } from "../weekly-digest.js";

describe("buildDigestHtml", () => {
  it("includes every stat in the output", () => {
    const html = buildDigestHtml({
      newSignups: 3,
      pastDueCount: 1,
      mrr: 249.5,
      activeCount: 12,
      trialingCount: 4,
      generatedAt: "2026-11-13T00:00:00.000Z",
    });

    expect(html).toContain("3");
    expect(html).toContain("12");
    expect(html).toContain("4");
    expect(html).toContain("$249.50");
    expect(html).toContain("worth a check-in");
  });

  it("omits the check-in nudge when nothing is past due", () => {
    const html = buildDigestHtml({
      newSignups: 0,
      pastDueCount: 0,
      mrr: 0,
      activeCount: 0,
      trialingCount: 0,
      generatedAt: "2026-11-13T00:00:00.000Z",
    });

    expect(html).not.toContain("worth a check-in");
  });
});
