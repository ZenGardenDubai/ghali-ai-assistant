import { describe, it, expect } from "vitest";
import {
  scoreItemMatch,
  aggregateItems,
  deriveCurrency,
  type ItemLike,
} from "./items";

// ============================================================================
// scoreItemMatch
// ============================================================================

describe("scoreItemMatch", () => {
  const item: ItemLike = {
    title: "Lunch at Zuma",
    body: "Business meeting with Ahmed from Emirates",
    tags: ["dining", "client"],
    status: "active",
  };

  it("returns 100 for exact title match (case-insensitive)", () => {
    expect(scoreItemMatch(item, "lunch at zuma")).toBe(100);
    expect(scoreItemMatch(item, "Lunch at Zuma")).toBe(100);
  });

  it("returns 80 for title prefix match", () => {
    expect(scoreItemMatch(item, "lunch at")).toBe(80);
    expect(scoreItemMatch(item, "Lunch")).toBe(80);
  });

  it("returns 60 for title substring match", () => {
    expect(scoreItemMatch(item, "Zuma")).toBe(60);
    expect(scoreItemMatch(item, "at Zuma")).toBe(60);
  });

  it("returns 40 for body match", () => {
    expect(scoreItemMatch(item, "Ahmed")).toBe(40);
    expect(scoreItemMatch(item, "Emirates")).toBe(40);
  });

  it("returns 20 for tag match", () => {
    expect(scoreItemMatch(item, "dining")).toBe(20);
    expect(scoreItemMatch(item, "client")).toBe(20);
  });

  it("returns 0 for no match", () => {
    expect(scoreItemMatch(item, "groceries")).toBe(0);
    expect(scoreItemMatch(item, "xyz")).toBe(0);
  });

  it("returns 0 for empty query", () => {
    expect(scoreItemMatch(item, "")).toBe(0);
    expect(scoreItemMatch(item, "   ")).toBe(0);
  });

  it("handles item with no body or tags", () => {
    const minimal: ItemLike = { title: "Quick note", status: "active" };
    expect(scoreItemMatch(minimal, "note")).toBe(60);
    expect(scoreItemMatch(minimal, "body text")).toBe(0);
  });

  it("prefers higher-scoring matches", () => {
    // "lunch" matches title prefix (80), not body or tag
    expect(scoreItemMatch(item, "lunch")).toBe(80);
  });
});

// ============================================================================
// aggregateItems
// ============================================================================

describe("aggregateItems", () => {
  const items: ItemLike[] = [
    { title: "Coffee", amount: 25, currency: "AED", tags: ["dining"], collectionId: "c1", status: "active" },
    { title: "Uber", amount: 45, currency: "AED", tags: ["transport"], collectionId: "c1", status: "active" },
    { title: "Lunch", amount: 120, currency: "AED", tags: ["dining", "client"], collectionId: "c2", status: "active" },
    { title: "Book", amount: 60, currency: "AED", tags: ["shopping"], collectionId: "c2", status: "done" },
    { title: "Note about meeting", status: "active" },
  ];

  describe("count", () => {
    it("returns total count", () => {
      const result = aggregateItems(items, "count");
      expect(result.mode).toBe("count");
      expect(result.totalCount).toBe(5);
    });

    it("handles empty array", () => {
      const result = aggregateItems([], "count");
      expect(result.totalCount).toBe(0);
    });
  });

  describe("sum", () => {
    it("sums amounts and determines currency", () => {
      const result = aggregateItems(items, "sum");
      expect(result.mode).toBe("sum");
      expect(result.totalAmount).toBe(250);
      expect(result.currency).toBe("AED");
      expect(result.totalCount).toBe(5);
    });

    it("handles items with no amounts", () => {
      const noAmounts: ItemLike[] = [
        { title: "Task 1", status: "active" },
        { title: "Task 2", status: "active" },
      ];
      const result = aggregateItems(noAmounts, "sum");
      expect(result.totalAmount).toBe(0);
      expect(result.currency).toBeUndefined();
    });
  });

  describe("group_by_tag", () => {
    it("groups items by tag with counts", () => {
      const result = aggregateItems(items, "group_by_tag");
      expect(result.mode).toBe("group_by_tag");
      expect(result.totalCount).toBe(5);

      const groups = result.groups!;
      const dining = groups.find((g) => g.key === "dining");
      expect(dining?.count).toBe(2);
      expect(dining?.amount).toBe(145); // 25 + 120

      const transport = groups.find((g) => g.key === "transport");
      expect(transport?.count).toBe(1);
      expect(transport?.amount).toBe(45);
    });

    it("puts untagged items in 'untagged' group", () => {
      const result = aggregateItems(items, "group_by_tag");
      const untagged = result.groups!.find((g) => g.key === "untagged");
      expect(untagged?.count).toBe(1);
    });

    it("sorts groups by count descending", () => {
      const result = aggregateItems(items, "group_by_tag");
      const counts = result.groups!.map((g) => g.count);
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
      }
    });
  });

  describe("group_by_collection", () => {
    it("groups items by collection ID", () => {
      const result = aggregateItems(items, "group_by_collection");
      expect(result.groups).toHaveLength(3); // c1, c2, uncategorized

      const c1 = result.groups!.find((g) => g.key === "c1");
      expect(c1?.count).toBe(2);

      const uncategorized = result.groups!.find(
        (g) => g.key === "uncategorized"
      );
      expect(uncategorized?.count).toBe(1);
    });

    it("uses collection names when provided", () => {
      const names = new Map([
        ["c1", "Expenses"],
        ["c2", "Shopping"],
      ]);
      const result = aggregateItems(items, "group_by_collection", names);
      const expenses = result.groups!.find((g) => g.key === "Expenses");
      expect(expenses?.count).toBe(2);
    });
  });
});

// ============================================================================
// deriveCurrency
// ============================================================================

describe("deriveCurrency", () => {
  it("returns AED for Dubai timezone", () => {
    expect(deriveCurrency("Asia/Dubai")).toBe("AED");
  });

  it("returns USD for US timezones", () => {
    expect(deriveCurrency("America/New_York")).toBe("USD");
    expect(deriveCurrency("America/Los_Angeles")).toBe("USD");
  });

  it("returns GBP for London", () => {
    expect(deriveCurrency("Europe/London")).toBe("GBP");
  });

  it("returns EUR for European timezones", () => {
    expect(deriveCurrency("Europe/Paris")).toBe("EUR");
    expect(deriveCurrency("Europe/Berlin")).toBe("EUR");
  });

  it("returns SAR for Riyadh", () => {
    expect(deriveCurrency("Asia/Riyadh")).toBe("SAR");
  });

  it("defaults to USD for unknown timezone", () => {
    expect(deriveCurrency("Unknown/Zone")).toBe("USD");
    expect(deriveCurrency("UTC")).toBe("USD");
  });
});
