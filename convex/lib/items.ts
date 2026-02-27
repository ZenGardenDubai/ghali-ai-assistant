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
        amount: val.amount || undefined,
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
        amount: val.amount || undefined,
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
  "Asia/Muscat": "AED", // Oman uses OMR but close to UAE
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
