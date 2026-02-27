import { describe, it, expect } from "vitest";
import {
  scoreItemMatch,
  aggregateItems,
  deriveCurrency,
  applyItemFilters,
  simplifyItemsForResponse,
  buildSimpleItemPatch,
  normalizeFilterDate,
  buildEmbeddingText,
  type ItemLike,
  type QueryItem,
} from "./items";

// ============================================================================
// buildEmbeddingText
// ============================================================================

describe("buildEmbeddingText", () => {
  it("returns title only when no body or tags", () => {
    expect(buildEmbeddingText({ title: "Coffee" })).toBe("Coffee");
  });

  it("includes body when provided", () => {
    expect(buildEmbeddingText({ title: "Coffee", body: "At Starbucks" })).toBe(
      "Coffee At Starbucks"
    );
  });

  it("includes tags when provided", () => {
    expect(
      buildEmbeddingText({ title: "Coffee", tags: ["food", "drink"] })
    ).toBe("Coffee food drink");
  });

  it("includes title, body, and tags", () => {
    expect(
      buildEmbeddingText({
        title: "Coffee",
        body: "At Starbucks",
        tags: ["food", "drink"],
      })
    ).toBe("Coffee At Starbucks food drink");
  });

  it("skips empty body and empty tags array", () => {
    expect(buildEmbeddingText({ title: "Note", body: "", tags: [] })).toBe(
      "Note"
    );
  });
});

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

// ============================================================================
// applyItemFilters
// ============================================================================

describe("applyItemFilters", () => {
  const now = Date.now();
  const items: QueryItem[] = [
    { _id: "1", _creationTime: now - 86400000, title: "Coffee", status: "active", amount: 25, currency: "AED", tags: ["dining"], collectionId: "c1", dueDate: now + 86400000 },
    { _id: "2", _creationTime: now - 3600000, title: "Uber", status: "done", amount: 45, currency: "AED", tags: ["transport"], collectionId: "c1" },
    { _id: "3", _creationTime: now, title: "Lunch", status: "active", amount: 120, currency: "AED", tags: ["dining", "client"], collectionId: "c2", dueDate: now + 172800000 },
    { _id: "4", _creationTime: now, title: "Meeting notes", status: "active" },
  ];

  it("returns all items when no filters", () => {
    expect(applyItemFilters(items, {})).toHaveLength(4);
  });

  it("filters by status", () => {
    const result = applyItemFilters(items, { status: "done" });
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("2");
  });

  it("skips status filter for 'all'", () => {
    expect(applyItemFilters(items, { status: "all" })).toHaveLength(4);
  });

  it("filters by collectionId", () => {
    const result = applyItemFilters(items, { collectionId: "c2" });
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("3");
  });

  it("filters by tags (any match)", () => {
    const result = applyItemFilters(items, { tags: ["client"] });
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("3");
  });

  it("filters by dueBefore", () => {
    const result = applyItemFilters(items, { dueBefore: now + 100000000 });
    expect(result).toHaveLength(1); // only item 1 (dueDate < dueBefore)
  });

  it("filters by dueAfter", () => {
    const result = applyItemFilters(items, { dueAfter: now + 100000000 });
    expect(result).toHaveLength(1); // only item 3 (172800000 > 100000000)
  });

  it("filters by hasAmount", () => {
    const result = applyItemFilters(items, { hasAmount: true });
    expect(result).toHaveLength(3);
  });

  it("filters by dateFrom", () => {
    const result = applyItemFilters(items, { dateFrom: now - 7200000 });
    expect(result).toHaveLength(3); // items 2, 3, 4
  });

  it("filters by dateTo", () => {
    const result = applyItemFilters(items, { dateTo: now - 7200000 });
    expect(result).toHaveLength(1); // only item 1
  });

  it("applies limit", () => {
    const result = applyItemFilters(items, { limit: 2 });
    expect(result).toHaveLength(2);
  });

  it("combines multiple filters", () => {
    const result = applyItemFilters(items, { status: "active", hasAmount: true, collectionId: "c1" });
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("1");
  });
});

// ============================================================================
// simplifyItemsForResponse
// ============================================================================

describe("simplifyItemsForResponse", () => {
  it("maps items to simplified format", () => {
    const items: QueryItem[] = [
      { _id: "1", _creationTime: 1700000000000, title: "Coffee", status: "active", amount: 25, currency: "AED", tags: ["dining"], priority: "low", dueDate: 1700100000000 },
    ];
    const result = simplifyItemsForResponse(items);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "1",
      title: "Coffee",
      body: undefined,
      status: "active",
      priority: "low",
      dueDate: new Date(1700100000000).toISOString(),
      amount: 25,
      currency: "AED",
      tags: ["dining"],
      createdAt: new Date(1700000000000).toISOString(),
    });
  });

  it("omits dueDate when not set", () => {
    const items: QueryItem[] = [
      { _id: "2", _creationTime: 1700000000000, title: "Note", status: "active" },
    ];
    const result = simplifyItemsForResponse(items);
    expect(result[0].dueDate).toBeUndefined();
  });
});

// ============================================================================
// buildSimpleItemPatch
// ============================================================================

describe("buildSimpleItemPatch", () => {
  it("builds patch from provided fields", () => {
    const { patch, changes } = buildSimpleItemPatch({
      title: "New title",
      amount: 50,
      tags: ["food"],
    });
    expect(patch).toEqual({ title: "New title", amount: 50, tags: ["food"] });
    expect(changes).toEqual(["title", "amount", "tags"]);
  });

  it("ignores undefined fields", () => {
    const { patch, changes } = buildSimpleItemPatch({ title: "Updated" });
    expect(patch).toEqual({ title: "Updated" });
    expect(changes).toEqual(["title"]);
  });

  it("returns empty patch when no fields provided", () => {
    const { patch, changes } = buildSimpleItemPatch({});
    expect(patch).toEqual({});
    expect(changes).toEqual([]);
  });

  it("preserves explicit empty-string values", () => {
    const { patch, changes } = buildSimpleItemPatch({
      body: "",
      currency: "",
    });
    expect(patch).toEqual({ body: "", currency: "" });
    expect(changes).toEqual(["body", "currency"]);
  });

  it("includes all field types", () => {
    const { patch, changes } = buildSimpleItemPatch({
      title: "T",
      body: "B",
      status: "done",
      priority: "high",
      amount: 100,
      currency: "USD",
      tags: ["a"],
      metadata: { key: "val" },
    });
    expect(Object.keys(patch)).toHaveLength(8);
    expect(changes).toHaveLength(8);
  });
});

// ============================================================================
// normalizeFilterDate
// ============================================================================

describe("normalizeFilterDate", () => {
  it("appends start-of-day time for date-only input", () => {
    expect(normalizeFilterDate("2026-03-01")).toBe("2026-03-01T00:00:00");
  });

  it("appends end-of-day time when endOfDay is true", () => {
    expect(normalizeFilterDate("2026-03-01", true)).toBe("2026-03-01T23:59:59");
  });

  it("passes through full datetime strings unchanged", () => {
    expect(normalizeFilterDate("2026-03-01T14:30:00")).toBe("2026-03-01T14:30:00");
    expect(normalizeFilterDate("2026-03-01T14:30:00", true)).toBe("2026-03-01T14:30:00");
  });
});
