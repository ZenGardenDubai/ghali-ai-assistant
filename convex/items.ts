/**
 * Items & Collections — CRUD mutations and queries.
 *
 * Collections group items. Items are the universal record (tasks, expenses,
 * contacts, notes, etc.). All functions are internal — called by agent tools.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  ITEMS_LIMIT_BASIC,
  ITEMS_LIMIT_PRO,
  COLLECTIONS_LIMIT_BASIC,
  COLLECTIONS_LIMIT_PRO,
  ITEMS_QUERY_DEFAULT_LIMIT,
  ITEMS_QUERY_MAX_LIMIT,
} from "./constants";
import { scoreItemMatch } from "./lib/items";

/** Valid item statuses */
const ITEM_STATUSES = ["active", "done", "archived"] as const;
type ItemStatus = (typeof ITEM_STATUSES)[number];

// ============================================================================
// Collections
// ============================================================================

/**
 * Create a collection with dedup check via by_userId_name index.
 */
export const createCollection = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, icon, description, type }) => {
    // Dedup — check if collection with this name already exists (case-insensitive)
    const userCollections = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const existing = userCollections.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      return existing._id;
    }

    // Enforce tier limit
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const limit =
      user.tier === "pro" ? COLLECTIONS_LIMIT_PRO : COLLECTIONS_LIMIT_BASIC;

    if (limit !== Infinity) {
      const activeCollections = userCollections.filter((c) => !c.archived);
      if (activeCollections.length >= limit) {
        throw new Error(
          `Collection limit reached (${limit}). Archive some collections first or upgrade to Pro.`
        );
      }
    }

    return await ctx.db.insert("collections", {
      userId,
      name,
      icon,
      description,
      type,
    });
  },
});

/**
 * Lookup a collection by userId + name.
 */
export const getCollectionByName = internalQuery({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, { userId, name }) => {
    // Case-insensitive lookup (consistent with createCollection dedup)
    const collections = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return collections.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    ) ?? null;
  },
});

/**
 * List all collections with item counts. Excludes archived by default.
 */
export const listCollections = internalQuery({
  args: {
    userId: v.id("users"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, includeArchived }) => {
    let collections = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (!includeArchived) {
      collections = collections.filter((c) => !c.archived);
    }

    // Get all user items once, then count per collection (avoids N+1)
    const allItems = await ctx.db
      .query("items")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "done")
        )
      )
      .collect();

    // Build a count map
    const countMap = new Map<string, number>();
    for (const item of allItems) {
      if (item.collectionId) {
        countMap.set(
          item.collectionId,
          (countMap.get(item.collectionId) ?? 0) + 1
        );
      }
    }

    return collections.map((collection) => ({
      ...collection,
      itemCount: countMap.get(collection._id) ?? 0,
    }));
  },
});

/**
 * Update a collection (rename, archive, set icon/description) with ownership check.
 */
export const updateCollection = internalMutation({
  args: {
    collectionId: v.id("collections"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, { collectionId, userId, ...updates }) => {
    const collection = await ctx.db.get(collectionId);
    if (!collection || collection.userId !== userId) {
      throw new Error("Collection not found");
    }

    // If renaming, check for case-insensitive name collision
    if (updates.name && updates.name.toLowerCase() !== collection.name.toLowerCase()) {
      const userCollections = await ctx.db
        .query("collections")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();

      const existing = userCollections.find(
        (c) => c._id !== collectionId && c.name.toLowerCase() === updates.name!.toLowerCase()
      );

      if (existing) {
        throw new Error(
          `A collection named "${updates.name}" already exists.`
        );
      }
    }

    // Filter out undefined values
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(collectionId, patch);
    }

    return await ctx.db.get(collectionId);
  },
});

// ============================================================================
// Items
// ============================================================================

/**
 * Create an item. Enforces tier-based limits on active+done items.
 * Validates collectionId ownership if provided.
 */
export const createItem = internalMutation({
  args: {
    userId: v.id("users"),
    collectionId: v.optional(v.id("collections")),
    title: v.string(),
    body: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    reminderAt: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
    mediaStorageId: v.optional(v.id("_storage")),
    reminderJobId: v.optional(v.id("scheduledJobs")),
    reminderCronId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, status: statusArg, collectionId, ...fields }) => {
    const status = statusArg ?? "active";

    // Validate status
    if (!ITEM_STATUSES.includes(status as typeof ITEM_STATUSES[number])) {
      throw new Error(`Invalid status "${status}". Must be one of: ${ITEM_STATUSES.join(", ")}`);
    }

    // Validate collection ownership if provided
    if (collectionId) {
      const collection = await ctx.db.get(collectionId);
      if (!collection || collection.userId !== userId) {
        throw new Error("Collection not found");
      }
    }

    // Enforce tier limit for active+done items
    if (status !== "archived") {
      const user = await ctx.db.get(userId);
      if (!user) throw new Error("User not found");

      const limit =
        user.tier === "pro" ? ITEMS_LIMIT_PRO : ITEMS_LIMIT_BASIC;

      if (limit !== Infinity) {
        const existing = await ctx.db
          .query("items")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .filter((q) =>
            q.or(
              q.eq(q.field("status"), "active"),
              q.eq(q.field("status"), "done")
            )
          )
          .collect();

        if (existing.length >= limit) {
          throw new Error(
            `Item limit reached (${limit}). Archive some items first or upgrade to Pro.`
          );
        }
      }
    }

    return await ctx.db.insert("items", {
      userId,
      collectionId,
      status: status as ItemStatus,
      ...fields,
    });
  },
});

/**
 * Get an item by ID with ownership check.
 */
export const getItem = internalQuery({
  args: {
    itemId: v.id("items"),
    userId: v.id("users"),
  },
  handler: async (ctx, { itemId, userId }) => {
    const item = await ctx.db.get(itemId);
    if (!item || item.userId !== userId) {
      return null;
    }
    return item;
  },
});

/**
 * Update an item. Auto-sets completedAt on status→done.
 * Shallow merges metadata. Validates collection ownership on move.
 */
export const updateItem = internalMutation({
  args: {
    itemId: v.id("items"),
    userId: v.id("users"),
    updates: v.object({
      title: v.optional(v.string()),
      body: v.optional(v.string()),
      status: v.optional(v.string()),
      priority: v.optional(v.string()),
      dueDate: v.optional(v.number()),
      amount: v.optional(v.number()),
      currency: v.optional(v.string()),
      reminderAt: v.optional(v.number()),
      tags: v.optional(v.array(v.string())),
      metadata: v.optional(v.any()),
      collectionId: v.optional(v.id("collections")),
      reminderJobId: v.optional(v.id("scheduledJobs")),
      reminderCronId: v.optional(v.string()),
      mediaStorageId: v.optional(v.id("_storage")),
    }),
  },
  handler: async (ctx, { itemId, userId, updates }) => {
    const item = await ctx.db.get(itemId);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found");
    }

    // Validate status if provided
    if (updates.status && !ITEM_STATUSES.includes(updates.status as typeof ITEM_STATUSES[number])) {
      throw new Error(`Invalid status "${updates.status}". Must be one of: ${ITEM_STATUSES.join(", ")}`);
    }

    // Validate collection ownership if moving to a different collection
    if (updates.collectionId && updates.collectionId !== item.collectionId) {
      const collection = await ctx.db.get(updates.collectionId);
      if (!collection || collection.userId !== userId) {
        throw new Error("Collection not found");
      }
    }

    const patch: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === "metadata" && item.metadata) {
          // Shallow merge metadata
          patch.metadata = { ...(item.metadata as Record<string, unknown>), ...(value as Record<string, unknown>) };
        } else {
          patch[key] = value;
        }
      }
    }

    // Auto-set completedAt when status changes to done
    if (updates.status === "done" && item.status !== "done") {
      patch.completedAt = Date.now();
    }

    // Clear completedAt if status moves away from done — use replace for the field
    if (updates.status && updates.status !== "done" && item.status === "done") {
      // Convex patch ignores undefined, so we need to replace the full document
      const currentDoc = (await ctx.db.get(itemId))!;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, _creationTime, completedAt, ...rest } = currentDoc;
      await ctx.db.replace(itemId, { ...rest, ...patch });
      return await ctx.db.get(itemId);
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(itemId, patch);
    }

    return await ctx.db.get(itemId);
  },
});

/**
 * Query items with structured filters.
 */
export const queryItems = internalQuery({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tags: v.optional(v.array(v.string())),
    dueBefore: v.optional(v.number()),
    dueAfter: v.optional(v.number()),
    hasAmount: v.optional(v.boolean()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { userId, status, collectionId, tags, dueBefore, dueAfter, hasAmount, dateFrom, dateTo, limit }
  ) => {
    const queryLimit = Math.min(
      limit ?? ITEMS_QUERY_DEFAULT_LIMIT,
      ITEMS_QUERY_MAX_LIMIT
    );

    // Start with the most selective index
    let query;
    if (status && status !== "all") {
      query = ctx.db
        .query("items")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", userId).eq("status", status as ItemStatus)
        );
    } else {
      query = ctx.db
        .query("items")
        .withIndex("by_userId", (q) => q.eq("userId", userId));
    }

    // Apply filters
    let items = await query.collect();

    if (status === "all") {
      // no status filter
    } else if (!status) {
      items = items.filter((i) => i.status !== "archived");
    }

    if (collectionId) {
      items = items.filter((i) => i.collectionId === collectionId);
    }

    if (tags && tags.length > 0) {
      items = items.filter((i) =>
        i.tags?.some((t) => tags.includes(t))
      );
    }

    if (dueBefore != null) {
      items = items.filter((i) => i.dueDate != null && i.dueDate <= dueBefore);
    }

    if (dueAfter != null) {
      items = items.filter((i) => i.dueDate != null && i.dueDate >= dueAfter);
    }

    if (hasAmount) {
      items = items.filter((i) => i.amount != null);
    }

    if (dateFrom != null) {
      items = items.filter((i) => i._creationTime >= dateFrom);
    }

    if (dateTo != null) {
      items = items.filter((i) => i._creationTime <= dateTo);
    }

    return items.slice(0, queryLimit);
  },
});

/**
 * Text-based item resolution for finding items by user reference.
 * Uses scoreItemMatch for ranking.
 */
export const findItemByText = internalQuery({
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, query, limit }) => {
    const maxResults = limit ?? 5;

    // Get active+done items for this user (capped at 1000 to bound memory)
    const items = await ctx.db
      .query("items")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "done")
        )
      )
      .take(1000);

    // Score each item
    const scored = items
      .map((item) => ({
        item,
        score: scoreItemMatch(
          {
            title: item.title,
            body: item.body,
            tags: item.tags,
            status: item.status,
          },
          query
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return scored.map(({ item, score }) => ({ ...item, _score: score }));
  },
});

/**
 * Count active+done items for a user (for limit enforcement).
 */
export const countUserItems = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const items = await ctx.db
      .query("items")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "done")
        )
      )
      .collect();

    return items.length;
  },
});

/**
 * Delete all items and collections for a user (used by clearEverything).
 */
export const deleteAllUserItems = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // Delete all items
    const items = await ctx.db
      .query("items")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete all collections
    const collections = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const collection of collections) {
      await ctx.db.delete(collection._id);
    }

    return { itemsDeleted: items.length, collectionsDeleted: collections.length };
  },
});
