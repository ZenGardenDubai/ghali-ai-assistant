import { v } from "convex/values";
import { internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ─── Pure helpers (exported for tests) ───────────────────────────────────────

/** Extract hashtags from a tweet string. */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g) ?? [];
  return [...new Set(matches)];
}

/** Truncate tweet content to Twitter's 280-character limit. */
export function truncateTweet(text: string, limit = 280): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1) + "…";
}

/** Build the prompt for Claude to generate tweet variants. */
export function buildTweetPrompt(
  featureTitle: string,
  featureDescription: string,
  tone: "informative" | "casual" | "punchy",
  defaultHashtags: string[]
): string {
  const toneInstructions = {
    informative: "Write clear, factual, professional copy that explains the feature's value.",
    casual: "Write in a friendly, conversational tone as if texting a friend.",
    punchy: "Write short, punchy, high-energy copy. Bold claims, minimal words, maximum impact.",
  };

  const hashtagsHint =
    defaultHashtags.length > 0
      ? `Include relevant hashtags. Suggested: ${defaultHashtags.join(" ")}`
      : "Include 2-4 relevant hashtags like #AI #WhatsApp #Productivity #UAE";

  return `You are a social media copywriter for Ghali — a WhatsApp-first AI assistant for users in the UAE and beyond.

Generate exactly 3 tweet variants about this feature/update. Each variant must be under 280 characters.

Feature: ${featureTitle}
Details: ${featureDescription}

Tone: ${toneInstructions[tone]}
${hashtagsHint}

Return ONLY a JSON array with exactly 3 strings, each being a complete tweet. No explanation, no markdown, just the JSON array.
Example format: ["Tweet 1 text #hashtag", "Tweet 2 text #hashtag", "Tweet 3 text #hashtag"]`;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listFeatureQueue = internalQuery({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("done"),
        v.literal("skipped")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    const q = status
      ? ctx.db.query("featureQueue").withIndex("by_status", (q) => q.eq("status", status))
      : ctx.db.query("featureQueue");
    return q
      .order("desc")
      .take(limit ?? 50);
  },
});

export const listContentPosts = internalQuery({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("approved"),
        v.literal("scheduled"),
        v.literal("published"),
        v.literal("rejected")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    const q = status
      ? ctx.db.query("contentPosts").withIndex("by_status", (q) => q.eq("status", status))
      : ctx.db.query("contentPosts");
    const posts = await q.order("desc").take(limit ?? 50);
    return Promise.all(
      posts.map(async (post) => ({
        ...post,
        imageUrl: post.imageStorageId
          ? await ctx.storage.getUrl(post.imageStorageId)
          : null,
      }))
    );
  },
});

export const getContentPost = internalQuery({
  args: { postId: v.id("contentPosts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) return null;
    return {
      ...post,
      imageUrl: post.imageStorageId
        ? await ctx.storage.getUrl(post.imageStorageId)
        : null,
    };
  },
});

export const getContentStudioStats = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [draft, approved, scheduled, published, rejected, pending, done] = await Promise.all([
      ctx.db.query("contentPosts").withIndex("by_status", (q) => q.eq("status", "draft")).collect(),
      ctx.db.query("contentPosts").withIndex("by_status", (q) => q.eq("status", "approved")).collect(),
      ctx.db.query("contentPosts").withIndex("by_status", (q) => q.eq("status", "scheduled")).collect(),
      ctx.db.query("contentPosts").withIndex("by_status", (q) => q.eq("status", "published")).collect(),
      ctx.db.query("contentPosts").withIndex("by_status", (q) => q.eq("status", "rejected")).collect(),
      ctx.db.query("featureQueue").withIndex("by_status", (q) => q.eq("status", "pending")).collect(),
      ctx.db.query("featureQueue").withIndex("by_status", (q) => q.eq("status", "done")).collect(),
    ]);
    return {
      drafts: draft.length,
      approved: approved.length,
      scheduled: scheduled.length,
      published: published.length,
      rejected: rejected.length,
      pendingFeatures: pending.length,
      doneFeatures: done.length,
    };
  },
});

export const getSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const keys = [
      "content_studio_typefully_api_key",
      "content_studio_default_tone",
      "content_studio_default_hashtags",
      "content_studio_twitter_handle",
    ];
    const configs = await Promise.all(
      keys.map((key) =>
        ctx.db
          .query("appConfig")
          .withIndex("by_key", (q) => q.eq("key", key))
          .first()
      )
    );
    const result: Record<string, string> = {};
    keys.forEach((key, i) => {
      result[key] = configs[i]?.value ?? "";
    });
    return result;
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const addFeatureToQueue = internalMutation({
  args: {
    title: v.string(),
    description: v.string(),
    source: v.union(
      v.literal("github_pr"),
      v.literal("github_issue"),
      v.literal("github_release"),
      v.literal("manual")
    ),
    sourceUrl: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("featureQueue", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateFeatureStatus = internalMutation({
  args: {
    featureId: v.id("featureQueue"),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("done"),
      v.literal("skipped")
    ),
  },
  handler: async (ctx, { featureId, status }) => {
    await ctx.db.patch(featureId, { status });
  },
});

export const createContentPost = internalMutation({
  args: {
    featureId: v.optional(v.id("featureQueue")),
    content: v.string(),
    threadTweets: v.optional(v.array(v.string())),
    format: v.union(v.literal("single"), v.literal("thread"), v.literal("with_image")),
    tone: v.union(v.literal("informative"), v.literal("casual"), v.literal("punchy")),
    hashtags: v.array(v.string()),
    variantIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("contentPosts", {
      ...args,
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateContentPost = internalMutation({
  args: {
    postId: v.id("contentPosts"),
    content: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("approved"),
        v.literal("scheduled"),
        v.literal("published"),
        v.literal("rejected")
      )
    ),
    scheduledAt: v.optional(v.number()),
    typefullyId: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { postId, ...updates }) => {
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(postId, { ...filtered, updatedAt: Date.now() });
  },
});

export const deleteContentPost = internalMutation({
  args: { postId: v.id("contentPosts") },
  handler: async (ctx, { postId }) => {
    await ctx.db.delete(postId);
  },
});

export const saveSettings = internalMutation({
  args: {
    typefullyApiKey: v.optional(v.string()),
    defaultTone: v.optional(v.string()),
    defaultHashtags: v.optional(v.string()),
    twitterHandle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const map: Record<string, string | undefined> = {
      content_studio_typefully_api_key: args.typefullyApiKey,
      content_studio_default_tone: args.defaultTone,
      content_studio_default_hashtags: args.defaultHashtags,
      content_studio_twitter_handle: args.twitterHandle,
    };
    await Promise.all(
      Object.entries(map)
        .filter(([, v]) => v !== undefined)
        .map(async ([key, value]) => {
          const existing = await ctx.db
            .query("appConfig")
            .withIndex("by_key", (q) => q.eq("key", key))
            .first();
          if (existing) {
            await ctx.db.patch(existing._id, { value: value!, updatedAt: Date.now() });
          } else {
            await ctx.db.insert("appConfig", { key, value: value!, updatedAt: Date.now() });
          }
        })
    );
  },
});

export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

// ─── Actions (AI + external integrations) ────────────────────────────────────

export const generateTweetVariants = internalAction({
  args: {
    featureId: v.optional(v.id("featureQueue")),
    featureTitle: v.string(),
    featureDescription: v.string(),
    tone: v.union(v.literal("informative"), v.literal("casual"), v.literal("punchy")),
    format: v.union(v.literal("single"), v.literal("thread"), v.literal("with_image")),
    defaultHashtags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { featureId, featureTitle, featureDescription, tone, format, defaultHashtags } = args;

    // Mark feature as generating
    if (featureId) {
      await ctx.runMutation(internal.contentStudio.updateFeatureStatus, {
        featureId,
        status: "generating",
      });
    }

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

      const prompt = buildTweetPrompt(
        featureTitle,
        featureDescription,
        tone,
        defaultHashtags ?? []
      );

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error: ${err}`);
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };
      const rawText = data.content.find((c) => c.type === "text")?.text ?? "[]";

      // Parse JSON array of tweet strings
      let variants: string[] = [];
      try {
        const parsed = JSON.parse(rawText.trim());
        if (Array.isArray(parsed)) {
          variants = parsed.slice(0, 3).map((s: unknown) => String(s));
        }
      } catch {
        // Fallback: try to extract strings from the text
        const matches = rawText.match(/"([^"]+)"/g);
        if (matches) {
          variants = matches.slice(0, 3).map((m: string) => m.replace(/^"|"$/g, ""));
        }
      }

      if (variants.length === 0) {
        throw new Error("No tweet variants generated");
      }

      // Store each variant as a draft post
      const postIds: Id<"contentPosts">[] = [];
      for (let i = 0; i < variants.length; i++) {
        const content = truncateTweet(variants[i]);
        const hashtags = extractHashtags(content);
        const id = await ctx.runMutation(internal.contentStudio.createContentPost, {
          featureId: featureId ?? undefined,
          content,
          format,
          tone,
          hashtags,
          variantIndex: i,
        });
        postIds.push(id);
      }

      // Mark feature as done
      if (featureId) {
        await ctx.runMutation(internal.contentStudio.updateFeatureStatus, {
          featureId,
          status: "done",
        });
      }

      return { success: true, postIds };
    } catch (error) {
      // Reset feature status on failure
      if (featureId) {
        await ctx.runMutation(internal.contentStudio.updateFeatureStatus, {
          featureId,
          status: "pending",
        });
      }
      throw error;
    }
  },
});

export const pushToTypefully = internalAction({
  args: {
    postId: v.id("contentPosts"),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, { postId, scheduledAt }) => {
    const post = await ctx.runQuery(internal.contentStudio.getContentPost, { postId });
    if (!post) throw new Error("Post not found");

    const settings = await ctx.runQuery(internal.contentStudio.getSettings, {});
    const apiKey = settings["content_studio_typefully_api_key"];
    if (!apiKey) throw new Error("Typefully API key not configured. Set it in Content Studio Settings.");

    // Build Typefully payload
    const payload: Record<string, unknown> = {
      content: post.content,
    };

    if (scheduledAt) {
      payload["schedule-date"] = new Date(scheduledAt).toISOString();
    } else {
      payload["auto-retweet-enabled"] = false;
      payload["auto-plug-enabled"] = false;
    }

    const response = await fetch("https://api.typefully.com/v1/drafts/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Typefully API error: ${err}`);
    }

    const data = await response.json() as { id?: string };
    const typefullyId = data.id ? String(data.id) : undefined;

    // Update post with Typefully ID and status
    await ctx.runMutation(internal.contentStudio.updateContentPost, {
      postId,
      typefullyId,
      status: scheduledAt ? "scheduled" : "approved",
      scheduledAt: scheduledAt ?? undefined,
    });

    return { success: true, typefullyId };
  },
});

export const markAsPublished = internalMutation({
  args: {
    typefullyId: v.string(),
  },
  handler: async (ctx, { typefullyId }) => {
    const post = await ctx.db
      .query("contentPosts")
      .filter((q) => q.eq(q.field("typefullyId"), typefullyId))
      .first();
    if (!post) return { found: false };
    await ctx.db.patch(post._id, { status: "published", updatedAt: Date.now() });
    return { found: true, postId: post._id };
  },
});
