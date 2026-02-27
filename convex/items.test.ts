import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Helper to create a test user
async function createUser(t: ReturnType<typeof convexTest>, phone = "+971501234567") {
  return await t.mutation(internal.users.findOrCreateUser, { phone });
}

// ============================================================================
// Collections
// ============================================================================

describe("createCollection", () => {
  it("creates a new collection", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const collectionId = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Expenses",
      icon: "💰",
      type: "expenses",
    });

    expect(collectionId).toBeDefined();

    const collection = await t.query(internal.items.getCollectionByName, {
      userId,
      name: "Expenses",
    });

    expect(collection).not.toBeNull();
    expect(collection!.name).toBe("Expenses");
    expect(collection!.icon).toBe("💰");
    expect(collection!.type).toBe("expenses");
  });

  it("returns existing collection ID on dedup", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const id1 = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Tasks",
    });

    const id2 = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Tasks",
    });

    expect(id1).toBe(id2);
  });

  it("deduplicates case-insensitively", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const id1 = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Expenses",
    });

    const id2 = await t.mutation(internal.items.createCollection, {
      userId,
      name: "expenses",
    });

    const id3 = await t.mutation(internal.items.createCollection, {
      userId,
      name: "EXPENSES",
    });

    expect(id1).toBe(id2);
    expect(id1).toBe(id3);
  });

  it("enforces basic tier collection limit", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    // Create 10 collections (basic limit)
    for (let i = 0; i < 10; i++) {
      await t.mutation(internal.items.createCollection, {
        userId,
        name: `Collection ${i}`,
      });
    }

    // 11th should fail
    await expect(
      t.mutation(internal.items.createCollection, {
        userId,
        name: "Collection 10",
      })
    ).rejects.toThrow("Collection limit reached");
  });
});

describe("listCollections", () => {
  it("lists collections with item counts", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const collId = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Expenses",
    });

    // Add 2 items to the collection
    await t.mutation(internal.items.createItem, {
      userId,
      collectionId: collId,
      title: "Coffee",
      amount: 25,
    });
    await t.mutation(internal.items.createItem, {
      userId,
      collectionId: collId,
      title: "Lunch",
      amount: 120,
    });

    const collections = await t.query(internal.items.listCollections, {
      userId,
    });

    expect(collections).toHaveLength(1);
    expect(collections[0].name).toBe("Expenses");
    expect(collections[0].itemCount).toBe(2);
  });

  it("excludes archived collections by default", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const collId = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Old Stuff",
    });

    await t.mutation(internal.items.updateCollection, {
      collectionId: collId,
      userId,
      archived: true,
    });

    const collections = await t.query(internal.items.listCollections, {
      userId,
    });

    expect(collections).toHaveLength(0);

    // With includeArchived
    const allCollections = await t.query(internal.items.listCollections, {
      userId,
      includeArchived: true,
    });

    expect(allCollections).toHaveLength(1);
  });
});

describe("updateCollection", () => {
  it("renames a collection", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const collId = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Stuff",
    });

    const updated = await t.mutation(internal.items.updateCollection, {
      collectionId: collId,
      userId,
      name: "Important Stuff",
    });

    expect(updated!.name).toBe("Important Stuff");
  });

  it("rejects rename to existing name", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    await t.mutation(internal.items.createCollection, {
      userId,
      name: "Expenses",
    });

    const collId2 = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Tasks",
    });

    await expect(
      t.mutation(internal.items.updateCollection, {
        collectionId: collId2,
        userId,
        name: "Expenses",
      })
    ).rejects.toThrow("already exists");
  });

  it("rejects update for wrong owner", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createUser(t, "+971501234567");
    const userId2 = await createUser(t, "+971509876543");

    const collId = await t.mutation(internal.items.createCollection, {
      userId: userId1,
      name: "My Collection",
    });

    await expect(
      t.mutation(internal.items.updateCollection, {
        collectionId: collId,
        userId: userId2,
        name: "Stolen",
      })
    ).rejects.toThrow("Collection not found");
  });
});

// ============================================================================
// Items
// ============================================================================

describe("createItem", () => {
  it("creates an item with default status active", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const itemId = await t.mutation(internal.items.createItem, {
      userId,
      title: "Buy groceries",
      tags: ["shopping"],
    });

    const item = await t.query(internal.items.getItem, { itemId, userId });
    expect(item).not.toBeNull();
    expect(item!.title).toBe("Buy groceries");
    expect(item!.status).toBe("active");
    expect(item!.tags).toEqual(["shopping"]);
  });

  it("creates an expense item", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const itemId = await t.mutation(internal.items.createItem, {
      userId,
      title: "Lunch at Zuma",
      amount: 450,
      currency: "AED",
      tags: ["dining"],
    });

    const item = await t.query(internal.items.getItem, { itemId, userId });
    expect(item!.amount).toBe(450);
    expect(item!.currency).toBe("AED");
  });

  it("rejects invalid status", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    await expect(
      t.mutation(internal.items.createItem, {
        userId,
        title: "Bad status",
        status: "completed",
      })
    ).rejects.toThrow("Invalid status");
  });

  it("rejects collectionId belonging to another user", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createUser(t, "+971501234567");
    const userId2 = await createUser(t, "+971509876543");

    const collId = await t.mutation(internal.items.createCollection, {
      userId: userId1,
      name: "My Collection",
    });

    await expect(
      t.mutation(internal.items.createItem, {
        userId: userId2,
        collectionId: collId,
        title: "Sneaky item",
      })
    ).rejects.toThrow("Collection not found");
  });

  it("enforces basic tier item limit", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    // Create 200 items (basic limit)
    for (let i = 0; i < 200; i++) {
      await t.mutation(internal.items.createItem, {
        userId,
        title: `Item ${i}`,
      });
    }

    // 201st should fail
    await expect(
      t.mutation(internal.items.createItem, {
        userId,
        title: "One too many",
      })
    ).rejects.toThrow("Item limit reached");
  });

  it("allows archived items beyond limit", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    // Create items at limit
    for (let i = 0; i < 200; i++) {
      await t.mutation(internal.items.createItem, {
        userId,
        title: `Item ${i}`,
      });
    }

    // Archived items don't count
    const itemId = await t.mutation(internal.items.createItem, {
      userId,
      title: "Archived item",
      status: "archived",
    });

    expect(itemId).toBeDefined();
  });

  it("returns existing item ID on duplicate title in same collection (silent dedup)", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const collId = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Contacts",
    });

    const id1 = await t.mutation(internal.items.createItem, {
      userId,
      collectionId: collId,
      title: "Test User",
      metadata: { phone: "+971501234567" },
    });

    const id2 = await t.mutation(internal.items.createItem, {
      userId,
      collectionId: collId,
      title: "Test User",
      metadata: { phone: "+971501234567" },
    });

    expect(id1).toBe(id2);

    // Only one item should exist
    const items = await t.query(internal.items.queryItems, { userId });
    expect(items).toHaveLength(1);
  });

  it("deduplicates items case-insensitively", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const id1 = await t.mutation(internal.items.createItem, {
      userId,
      title: "Test User",
    });

    const id2 = await t.mutation(internal.items.createItem, {
      userId,
      title: "test user",
    });

    const id3 = await t.mutation(internal.items.createItem, {
      userId,
      title: "TEST USER",
    });

    expect(id1).toBe(id2);
    expect(id1).toBe(id3);
  });

  it("does not dedup items across different collections", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const coll1 = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Contacts",
    });
    const coll2 = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Notes",
    });

    const id1 = await t.mutation(internal.items.createItem, {
      userId,
      collectionId: coll1,
      title: "Ahmed",
    });

    const id2 = await t.mutation(internal.items.createItem, {
      userId,
      collectionId: coll2,
      title: "Ahmed",
    });

    expect(id1).not.toBe(id2);

    const items = await t.query(internal.items.queryItems, { userId });
    expect(items).toHaveLength(2);
  });

  it("does not dedup against archived items", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const archivedId = await t.mutation(internal.items.createItem, {
      userId,
      title: "Old Contact",
      status: "archived",
    });

    const newId = await t.mutation(internal.items.createItem, {
      userId,
      title: "Old Contact",
    });

    expect(archivedId).not.toBe(newId);

    const active = await t.query(internal.items.queryItems, { userId });
    expect(active).toHaveLength(1);
  });

  it("does not dedup items without collection against items with collection", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const collId = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Contacts",
    });

    const id1 = await t.mutation(internal.items.createItem, {
      userId,
      collectionId: collId,
      title: "Ahmed",
    });

    const id2 = await t.mutation(internal.items.createItem, {
      userId,
      title: "Ahmed", // no collectionId
    });

    expect(id1).not.toBe(id2);

    const items = await t.query(internal.items.queryItems, { userId });
    expect(items).toHaveLength(2);
  });
});

describe("getItem", () => {
  it("returns null for wrong owner", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createUser(t, "+971501234567");
    const userId2 = await createUser(t, "+971509876543");

    const itemId = await t.mutation(internal.items.createItem, {
      userId: userId1,
      title: "Secret item",
    });

    const item = await t.query(internal.items.getItem, {
      itemId,
      userId: userId2,
    });

    expect(item).toBeNull();
  });
});

describe("updateItem", () => {
  it("updates item fields", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const itemId = await t.mutation(internal.items.createItem, {
      userId,
      title: "Draft proposal",
      priority: "normal",
    });

    const updated = await t.mutation(internal.items.updateItem, {
      itemId,
      userId,
      updates: {
        title: "Finish proposal",
        priority: "high",
      },
    });

    expect(updated!.title).toBe("Finish proposal");
    expect(updated!.priority).toBe("high");
  });

  it("sets completedAt when status changes to done", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const itemId = await t.mutation(internal.items.createItem, {
      userId,
      title: "Task to complete",
    });

    const updated = await t.mutation(internal.items.updateItem, {
      itemId,
      userId,
      updates: { status: "done" },
    });

    expect(updated!.status).toBe("done");
    expect(updated!.completedAt).toBeDefined();
    expect(updated!.completedAt).toBeGreaterThan(0);
  });

  it("clears completedAt when status moves away from done", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const itemId = await t.mutation(internal.items.createItem, {
      userId,
      title: "Task",
    });

    // Mark done
    await t.mutation(internal.items.updateItem, {
      itemId,
      userId,
      updates: { status: "done" },
    });

    // Mark active again
    const updated = await t.mutation(internal.items.updateItem, {
      itemId,
      userId,
      updates: { status: "active" },
    });

    expect(updated!.status).toBe("active");
    expect(updated!.completedAt).toBeUndefined();
  });

  it("shallow merges metadata", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const itemId = await t.mutation(internal.items.createItem, {
      userId,
      title: "Ahmed",
      metadata: { phone: "+97150000", company: "Emirates" },
    });

    const updated = await t.mutation(internal.items.updateItem, {
      itemId,
      userId,
      updates: {
        metadata: { email: "ahmed@emirates.com" },
      },
    });

    expect(updated!.metadata).toEqual({
      phone: "+97150000",
      company: "Emirates",
      email: "ahmed@emirates.com",
    });
  });

  it("rejects moving item to another user's collection", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createUser(t, "+971501234567");
    const userId2 = await createUser(t, "+971509876543");

    const collId = await t.mutation(internal.items.createCollection, {
      userId: userId2,
      name: "Their Collection",
    });

    const itemId = await t.mutation(internal.items.createItem, {
      userId: userId1,
      title: "My item",
    });

    await expect(
      t.mutation(internal.items.updateItem, {
        itemId,
        userId: userId1,
        updates: { collectionId: collId },
      })
    ).rejects.toThrow("Collection not found");
  });

  it("rejects invalid status update", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const itemId = await t.mutation(internal.items.createItem, {
      userId,
      title: "Task",
    });

    await expect(
      t.mutation(internal.items.updateItem, {
        itemId,
        userId,
        updates: { status: "completed" },
      })
    ).rejects.toThrow("Invalid status");
  });

  it("rejects update for wrong owner", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createUser(t, "+971501234567");
    const userId2 = await createUser(t, "+971509876543");

    const itemId = await t.mutation(internal.items.createItem, {
      userId: userId1,
      title: "Private item",
    });

    await expect(
      t.mutation(internal.items.updateItem, {
        itemId,
        userId: userId2,
        updates: { title: "Hacked" },
      })
    ).rejects.toThrow("Item not found");
  });
});

describe("queryItems", () => {
  it("queries items by status", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    await t.mutation(internal.items.createItem, {
      userId,
      title: "Active task",
      status: "active",
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "Done task",
      status: "done",
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "Archived task",
      status: "archived",
    });

    const active = await t.query(internal.items.queryItems, {
      userId,
      status: "active",
    });
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe("Active task");

    // Default excludes archived
    const defaultQuery = await t.query(internal.items.queryItems, { userId });
    expect(defaultQuery).toHaveLength(2);

    // All statuses
    const all = await t.query(internal.items.queryItems, {
      userId,
      status: "all",
    });
    expect(all).toHaveLength(3);
  });

  it("filters by tags (any match)", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    await t.mutation(internal.items.createItem, {
      userId,
      title: "Dining expense",
      tags: ["dining", "business"],
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "Shopping",
      tags: ["shopping"],
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "No tags",
    });

    const dining = await t.query(internal.items.queryItems, {
      userId,
      tags: ["dining"],
    });
    expect(dining).toHaveLength(1);
    expect(dining[0].title).toBe("Dining expense");

    // Any match
    const diningOrShopping = await t.query(internal.items.queryItems, {
      userId,
      tags: ["dining", "shopping"],
    });
    expect(diningOrShopping).toHaveLength(2);
  });

  it("filters by hasAmount", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    await t.mutation(internal.items.createItem, {
      userId,
      title: "Expense",
      amount: 100,
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "Task",
    });

    const expenses = await t.query(internal.items.queryItems, {
      userId,
      hasAmount: true,
    });
    expect(expenses).toHaveLength(1);
    expect(expenses[0].title).toBe("Expense");
  });

  it("filters by due date range", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const now = Date.now();
    const tomorrow = now + 86_400_000;
    const nextWeek = now + 7 * 86_400_000;

    await t.mutation(internal.items.createItem, {
      userId,
      title: "Due tomorrow",
      dueDate: tomorrow,
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "Due next week",
      dueDate: nextWeek,
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "No due date",
    });

    const dueSoon = await t.query(internal.items.queryItems, {
      userId,
      dueBefore: tomorrow + 1,
    });
    expect(dueSoon).toHaveLength(1);
    expect(dueSoon[0].title).toBe("Due tomorrow");
  });

  it("respects limit", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    for (let i = 0; i < 5; i++) {
      await t.mutation(internal.items.createItem, {
        userId,
        title: `Item ${i}`,
      });
    }

    const limited = await t.query(internal.items.queryItems, {
      userId,
      limit: 3,
    });
    expect(limited).toHaveLength(3);
  });
});

describe("findItemByText", () => {
  it("finds items by exact title match", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    await t.mutation(internal.items.createItem, {
      userId,
      title: "Lunch at Zuma",
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "Coffee meeting",
    });

    const results = await t.query(internal.items.findItemByText, {
      userId,
      query: "Lunch at Zuma",
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Lunch at Zuma");
    expect(results[0]._score).toBe(100);
  });

  it("ranks matches by score", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    await t.mutation(internal.items.createItem, {
      userId,
      title: "Coffee with Ahmed",
      body: "Discussed the Zuma project",
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "Lunch at Zuma",
    });

    const results = await t.query(internal.items.findItemByText, {
      userId,
      query: "Zuma",
    });

    expect(results).toHaveLength(2);
    // Title substring match (60) ranks higher than body match (40)
    expect(results[0].title).toBe("Lunch at Zuma");
    expect(results[1].title).toBe("Coffee with Ahmed");
  });

  it("returns empty for no match", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    await t.mutation(internal.items.createItem, {
      userId,
      title: "Some item",
    });

    const results = await t.query(internal.items.findItemByText, {
      userId,
      query: "nonexistent",
    });

    expect(results).toHaveLength(0);
  });
});

describe("countUserItems", () => {
  it("counts only active and done items", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    await t.mutation(internal.items.createItem, {
      userId,
      title: "Active",
      status: "active",
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "Done",
      status: "done",
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "Archived",
      status: "archived",
    });

    const count = await t.query(internal.items.countUserItems, { userId });
    expect(count).toBe(2);
  });
});

describe("deleteAllUserItems", () => {
  it("deletes all items and collections", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t);

    const collId = await t.mutation(internal.items.createCollection, {
      userId,
      name: "Test",
    });

    await t.mutation(internal.items.createItem, {
      userId,
      collectionId: collId,
      title: "Item 1",
    });
    await t.mutation(internal.items.createItem, {
      userId,
      title: "Item 2",
    });

    const result = await t.mutation(internal.items.deleteAllUserItems, {
      userId,
    });

    expect(result.itemsDeleted).toBe(2);
    expect(result.collectionsDeleted).toBe(1);

    // Verify empty
    const count = await t.query(internal.items.countUserItems, { userId });
    expect(count).toBe(0);

    const collections = await t.query(internal.items.listCollections, {
      userId,
    });
    expect(collections).toHaveLength(0);
  });

  it("does not affect other users", async () => {
    const t = convexTest(schema, modules);
    const userId1 = await createUser(t, "+971501234567");
    const userId2 = await createUser(t, "+971509876543");

    await t.mutation(internal.items.createItem, {
      userId: userId1,
      title: "User 1 item",
    });
    await t.mutation(internal.items.createItem, {
      userId: userId2,
      title: "User 2 item",
    });

    await t.mutation(internal.items.deleteAllUserItems, { userId: userId1 });

    const user2Count = await t.query(internal.items.countUserItems, {
      userId: userId2,
    });
    expect(user2Count).toBe(1);
  });
});
