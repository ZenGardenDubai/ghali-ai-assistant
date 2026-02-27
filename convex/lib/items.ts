/**
 * Pure helper functions for the items system.
 * No Convex dependencies — fully testable in isolation.
 */

/**
 * Represents an item for scoring/aggregation purposes.
 * Subset of the full item document.
 */
export interface ItemLike {
  title: string;
  body?: string;
  tags?: string[];
  amount?: number;
  currency?: string;
  collectionId?: string;
  status: string;
}

/**
 * Extended item shape returned from queries (includes DB fields).
 */
export interface QueryItem extends ItemLike {
  _id: string;
  _creationTime: number;
  priority?: string;
  dueDate?: number;
  completedAt?: number;
  metadata?: unknown;
}

// ============================================================================
// Embedding Text Builder
// ============================================================================

/**
 * Build a single text string for embedding from item fields.
 * Concatenates title, body, and tags into one searchable text.
 */
export function buildEmbeddingText(item: {
  title: string;
  body?: string;
  tags?: string[];
}): string {
  const parts = [item.title];
  if (item.body) parts.push(item.body);
  if (item.tags?.length) parts.push(item.tags.join(" "));
  return parts.join(" ");
}

// ============================================================================
// Item Filtering (used by queryItemsTool text-search path)
// ============================================================================

export interface ItemFilterParams {
  status?: string;
  collectionId?: string;
  tags?: string[];
  dueBefore?: number;
  dueAfter?: number;
  dateFrom?: number;
  dateTo?: number;
  hasAmount?: boolean;
  limit?: number;
}

/**
 * Apply in-memory filters to an array of items.
 * Used after text search which doesn't support server-side filters.
 */
export function applyItemFilters<T extends QueryItem>(
  items: T[],
  filters: ItemFilterParams
): T[] {
  let result = items;

  if (filters.collectionId) {
    result = result.filter((i) => i.collectionId === filters.collectionId);
  }
  if (filters.status && filters.status !== "all") {
    result = result.filter((i) => i.status === filters.status);
  }
  if (filters.tags && filters.tags.length > 0) {
    result = result.filter((i) =>
      i.tags?.some((t) => filters.tags!.includes(t))
    );
  }
  if (filters.dueBefore != null) {
    result = result.filter((i) => i.dueDate != null && i.dueDate <= filters.dueBefore!);
  }
  if (filters.dueAfter != null) {
    result = result.filter((i) => i.dueDate != null && i.dueDate >= filters.dueAfter!);
  }
  if (filters.hasAmount) {
    result = result.filter((i) => i.amount != null);
  }
  if (filters.dateFrom != null) {
    result = result.filter((i) => i._creationTime >= filters.dateFrom!);
  }
  if (filters.dateTo != null) {
    result = result.filter((i) => i._creationTime <= filters.dateTo!);
  }

  return result.slice(0, filters.limit ?? 20);
}

// ============================================================================
// Response Formatting
// ============================================================================

/**
 * Simplify items for JSON tool responses (strip internal fields, format dates).
 */
export function simplifyItemsForResponse(items: QueryItem[]) {
  return items.map((i) => ({
    id: i._id,
    title: i.title,
    body: i.body,
    status: i.status,
    priority: i.priority,
    dueDate: i.dueDate ? new Date(i.dueDate).toISOString() : undefined,
    amount: i.amount,
    currency: i.currency,
    tags: i.tags,
    createdAt: new Date(i._creationTime).toISOString(),
  }));
}

// ============================================================================
// Update Patch Building
// ============================================================================

/**
 * Build a patch object from update fields (simple field mapping, no side effects).
 * Returns the patch and a list of changed field names.
 */
export function buildSimpleItemPatch(updates: {
  title?: string;
  body?: string;
  status?: string;
  priority?: string;
  amount?: number;
  currency?: string;
  tags?: string[];
  metadata?: unknown;
}): { patch: Record<string, unknown>; changes: string[] } {
  const patch: Record<string, unknown> = {};
  const changes: string[] = [];

  if (updates.title !== undefined) { patch.title = updates.title; changes.push("title"); }
  if (updates.body !== undefined) { patch.body = updates.body; changes.push("body"); }
  if (updates.status !== undefined) { patch.status = updates.status; changes.push("status"); }
  if (updates.priority !== undefined) { patch.priority = updates.priority; changes.push("priority"); }
  if (updates.amount != null) { patch.amount = updates.amount; changes.push("amount"); }
  if (updates.currency !== undefined) { patch.currency = updates.currency; changes.push("currency"); }
  if (updates.tags !== undefined) { patch.tags = updates.tags; changes.push("tags"); }
  if (updates.metadata !== undefined) { patch.metadata = updates.metadata; changes.push("metadata"); }

  return { patch, changes };
}

// ============================================================================
// Date Normalization
// ============================================================================

/**
 * Normalize a date string for filter parsing.
 * Accepts both "YYYY-MM-DD" (date-only) and "YYYY-MM-DDTHH:MM:SS" (full datetime).
 * For date-only inputs, appends start-of-day or end-of-day time.
 */
export function normalizeFilterDate(
  value: string,
  endOfDay = false
): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T${endOfDay ? "23:59:59" : "00:00:00"}`;
  }
  return value;
}

// ============================================================================
// Text Search Scoring
// ============================================================================

/**
 * Score how well an item matches a text query.
 * Higher score = better match.
 *
 * Scoring:
 * - 100: exact title match (case-insensitive)
 * - 80:  title starts with query
 * - 60:  title contains query as substring
 * - 40:  body contains query
 * - 20:  any tag matches query
 * - 0:   no match
 */
export function scoreItemMatch(item: ItemLike, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const title = item.title.toLowerCase();

  // Exact title match
  if (title === q) return 100;

  // Title prefix match
  if (title.startsWith(q)) return 80;

  // Title substring match
  if (title.includes(q)) return 60;

  // Body match
  if (item.body && item.body.toLowerCase().includes(q)) return 40;

  // Tag match
  if (item.tags?.some((tag) => tag.toLowerCase().includes(q))) return 20;

  return 0;
}

// ============================================================================
// Aggregation
// ============================================================================

export type AggregateMode =
  | "sum"
  | "count"
  | "group_by_tag"
  | "group_by_collection";

export interface AggregateResult {
  mode: AggregateMode;
  totalCount: number;
  totalAmount?: number;
  currency?: string;
  groups?: Array<{
    key: string;
    count: number;
    amount?: number;
  }>;
}

/**
 * Aggregate items by the specified mode.
 *
 * - sum: total amount across all items
 * - count: just the count
 * - group_by_tag: group by each tag (an item in multiple tags appears in each)
 * - group_by_collection: group by collectionId
 *
 * @param collectionNames - optional map of collectionId → name for group_by_collection
 */
export function aggregateItems(
  items: ItemLike[],
  mode: AggregateMode,
  collectionNames?: Map<string, string>
): AggregateResult {
  const totalCount = items.length;

  if (mode === "count") {
    return { mode, totalCount };
  }

  if (mode === "sum") {
    const withAmount = items.filter((i) => i.amount != null);
    const totalAmount = withAmount.reduce((sum, i) => sum + (i.amount ?? 0), 0);
    // Use the most common currency
    const currency = getMostCommonCurrency(withAmount);
    return { mode, totalCount, totalAmount, currency };
  }

  if (mode === "group_by_tag") {
    const tagMap = new Map<string, { count: number; amount: number }>();
    for (const item of items) {
      const tags = item.tags?.length ? item.tags : ["untagged"];
      for (const tag of tags) {
        const existing = tagMap.get(tag) ?? { count: 0, amount: 0 };
        existing.count++;
        existing.amount += item.amount ?? 0;
        tagMap.set(tag, existing);
      }
    }

    const groups = Array.from(tagMap.entries())
      .map(([key, val]) => ({
        key,
        count: val.count,
        amount: val.amount !== 0 ? val.amount : undefined,
      }))
      .sort((a, b) => b.count - a.count);

    return { mode, totalCount, groups };
  }

  if (mode === "group_by_collection") {
    const collMap = new Map<string, { count: number; amount: number }>();
    for (const item of items) {
      const key = item.collectionId ?? "uncategorized";
      const existing = collMap.get(key) ?? { count: 0, amount: 0 };
      existing.count++;
      existing.amount += item.amount ?? 0;
      collMap.set(key, existing);
    }

    const groups = Array.from(collMap.entries())
      .map(([key, val]) => ({
        key: collectionNames?.get(key) ?? key,
        count: val.count,
        amount: val.amount !== 0 ? val.amount : undefined,
      }))
      .sort((a, b) => b.count - a.count);

    return { mode, totalCount, groups };
  }

  return { mode, totalCount };
}

function getMostCommonCurrency(items: ItemLike[]): string | undefined {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.currency) {
      counts.set(item.currency, (counts.get(item.currency) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return undefined;

  let maxCurrency = "";
  let maxCount = 0;
  for (const [currency, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxCurrency = currency;
    }
  }
  return maxCurrency;
}

// ============================================================================
// Currency Derivation
// ============================================================================

const TIMEZONE_CURRENCY: Record<string, string> = {
  "Asia/Dubai": "AED",
  "Asia/Muscat": "OMR",
  "Asia/Riyadh": "SAR",
  "Asia/Bahrain": "BHD",
  "Asia/Qatar": "QAR",
  "Asia/Kuwait": "KWD",
  "America/New_York": "USD",
  "America/Chicago": "USD",
  "America/Denver": "USD",
  "America/Los_Angeles": "USD",
  "Europe/London": "GBP",
  "Europe/Paris": "EUR",
  "Europe/Berlin": "EUR",
  "Asia/Tokyo": "JPY",
  "Asia/Shanghai": "CNY",
  "Asia/Kolkata": "INR",
  "Asia/Karachi": "PKR",
  "Africa/Cairo": "EGP",
  "Africa/Johannesburg": "ZAR",
  "America/Sao_Paulo": "BRL",
  "Europe/Moscow": "RUB",
  "Asia/Seoul": "KRW",
  "Europe/Istanbul": "TRY",
  "Africa/Lagos": "NGN",
  "Asia/Dhaka": "BDT",
  "Asia/Jakarta": "IDR",
  "Australia/Sydney": "AUD",
  "Africa/Harare": "ZWL",
};

/**
 * Derive currency from a user's timezone.
 * Falls back to "USD" if timezone is unknown.
 */
export function deriveCurrency(timezone: string): string {
  return TIMEZONE_CURRENCY[timezone] ?? "USD";
}
