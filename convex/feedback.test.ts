import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("feedback tokens", () => {
  it("generates a valid token with correct expiry", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.mutation(internal.feedback.generateFeedbackToken, {
      userId,
    });

    expect(result.token).toBeDefined();
    expect(result.token).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(result.url).toContain("/feedback?token=");
  });

  it("validates a fresh token", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(
      internal.feedback.generateFeedbackToken,
      { userId }
    );

    const result = await t.query(internal.feedback.validateFeedbackToken, {
      token,
    });

    expect(result.valid).toBe(true);
    expect(result.phone).toBeDefined();
  });

  it("rejects expired token", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(
      internal.feedback.generateFeedbackToken,
      { userId }
    );

    // Fast-forward 16 minutes (past 15 min expiry)
    const sixteenMinutes = 16 * 60 * 1000;
    await t.finishInProgressScheduledFunctions();
    // Manually expire the token by updating it
    const tokenDoc = await t.run(async (ctx) => {
      return await ctx.db
        .query("feedbackTokens")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(tokenDoc!._id, {
        expiresAt: Date.now() - sixteenMinutes,
      });
    });

    const result = await t.query(internal.feedback.validateFeedbackToken, {
      token,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("rejects used token", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(
      internal.feedback.generateFeedbackToken,
      { userId }
    );

    // Mark token as used
    await t.run(async (ctx) => {
      const doc = await ctx.db
        .query("feedbackTokens")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
      await ctx.db.patch(doc!._id, { used: true });
    });

    const result = await t.query(internal.feedback.validateFeedbackToken, {
      token,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("used");
  });

  it("rejects non-existent token", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(internal.feedback.validateFeedbackToken, {
      token: "nonexistent_token_abc123",
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("not_found");
  });
});

describe("feedback submission", () => {
  it("submits feedback with correct fields", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const result = await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "bug",
      message: "The image generation is slow",
      source: "agent_tool",
    });

    expect(result.success).toBe(true);

    // Verify the feedback was stored
    const feedbackList = await t.query(internal.feedback.listFeedback, {});

    expect(feedbackList).toHaveLength(1);
    expect(feedbackList[0]!.category).toBe("bug");
    expect(feedbackList[0]!.message).toBe("The image generation is slow");
    expect(feedbackList[0]!.source).toBe("agent_tool");
    expect(feedbackList[0]!.status).toBe("new");
    expect(feedbackList[0]!.phone).toBe("+971501234567");
  });

  it("truncates messages exceeding max length", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const longMessage = "a".repeat(3000);
    await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "general",
      message: longMessage,
      source: "web",
    });

    const feedbackList = await t.query(internal.feedback.listFeedback, {});
    expect(feedbackList[0]!.message).toHaveLength(2000);
  });

  it("enforces rate limit of 3 per day", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Submit 3 feedbacks (should succeed)
    for (let i = 0; i < 3; i++) {
      const result = await t.mutation(internal.feedback.submitFeedback, {
        userId,
        category: "general",
        message: `Feedback ${i + 1}`,
        source: "web",
      });
      expect(result.success).toBe(true);
    }

    // 4th should fail
    const result = await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "general",
      message: "Feedback 4",
      source: "web",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("rate_limited");
  });

  it("submits feedback via token", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    const { token } = await t.mutation(
      internal.feedback.generateFeedbackToken,
      { userId }
    );

    const result = await t.mutation(
      internal.feedback.submitFeedbackViaToken,
      {
        token,
        category: "feature_request",
        message: "Add dark mode please",
      }
    );

    expect(result.success).toBe(true);

    // Verify token is now used
    const validation = await t.query(
      internal.feedback.validateFeedbackToken,
      { token }
    );
    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe("used");

    // Verify feedback was stored with correct source
    const feedbackList = await t.query(internal.feedback.listFeedback, {});
    expect(feedbackList).toHaveLength(1);
    expect(feedbackList[0]!.source).toBe("whatsapp_link");
  });
});

describe("feedback admin operations", () => {
  it("lists feedback ordered by createdAt desc", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "bug",
      message: "First feedback",
      source: "web",
    });
    await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "general",
      message: "Second feedback",
      source: "agent_tool",
    });

    const feedbackList = await t.query(internal.feedback.listFeedback, {});

    expect(feedbackList).toHaveLength(2);
    // Most recent first
    expect(feedbackList[0]!.message).toBe("Second feedback");
    expect(feedbackList[1]!.message).toBe("First feedback");
  });

  it("filters feedback by status", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "bug",
      message: "Bug report",
      source: "web",
    });

    // Get the feedback id and update status
    const all = await t.query(internal.feedback.listFeedback, {});
    await t.mutation(internal.feedback.updateFeedbackStatus, {
      feedbackId: all[0]!._id,
      status: "read",
    });

    // Submit another one (status: new)
    await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "general",
      message: "General feedback",
      source: "web",
    });

    const newOnly = await t.query(internal.feedback.listFeedback, {
      status: "new",
    });
    expect(newOnly).toHaveLength(1);
    expect(newOnly[0]!.message).toBe("General feedback");

    const readOnly = await t.query(internal.feedback.listFeedback, {
      status: "read",
    });
    expect(readOnly).toHaveLength(1);
    expect(readOnly[0]!.message).toBe("Bug report");
  });

  it("filters feedback by category", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "bug",
      message: "Bug",
      source: "web",
    });
    await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "feature_request",
      message: "Feature",
      source: "web",
    });

    const bugs = await t.query(internal.feedback.listFeedback, {
      category: "bug",
    });
    expect(bugs).toHaveLength(1);
    expect(bugs[0]!.message).toBe("Bug");
  });

  it("updates feedback status", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "bug",
      message: "Bug report",
      source: "web",
    });

    const all = await t.query(internal.feedback.listFeedback, {});
    await t.mutation(internal.feedback.updateFeedbackStatus, {
      feedbackId: all[0]!._id,
      status: "resolved",
    });

    const updated = await t.query(internal.feedback.listFeedback, {});
    expect(updated[0]!.status).toBe("resolved");
  });

  it("updates feedback admin notes", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "bug",
      message: "Bug report",
      source: "web",
    });

    const all = await t.query(internal.feedback.listFeedback, {});
    await t.mutation(internal.feedback.updateFeedbackNotes, {
      feedbackId: all[0]!._id,
      notes: "Looking into this",
    });

    const updated = await t.query(internal.feedback.listFeedback, {});
    expect(updated[0]!.adminNotes).toBe("Looking into this");
  });

  it("gets feedback stats by status", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "bug",
      message: "Bug 1",
      source: "web",
    });
    await t.mutation(internal.feedback.submitFeedback, {
      userId,
      category: "general",
      message: "General 1",
      source: "web",
    });

    // Update one to "read"
    const all = await t.query(internal.feedback.listFeedback, {});
    await t.mutation(internal.feedback.updateFeedbackStatus, {
      feedbackId: all[0]!._id,
      status: "read",
    });

    const stats = await t.query(internal.feedback.getFeedbackStats, {});

    expect(stats.new).toBe(1);
    expect(stats.read).toBe(1);
    expect(stats.in_progress).toBe(0);
    expect(stats.resolved).toBe(0);
    expect(stats.archived).toBe(0);
  });
});

describe("feedback token cleanup", () => {
  it("removes expired tokens and keeps valid ones", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.mutation(internal.users.findOrCreateUser, {
      phone: "+971501234567",
    });

    // Create a token
    const { token: validToken } = await t.mutation(
      internal.feedback.generateFeedbackToken,
      { userId }
    );

    // Create an expired token manually
    await t.run(async (ctx) => {
      await ctx.db.insert("feedbackTokens", {
        token: "expired_token_123",
        phone: "+971501234567",
        expiresAt: Date.now() - 1000,
        used: false,
      });
    });

    await t.mutation(internal.feedback.cleanupExpiredTokens, {});

    // Valid token should still exist
    const validResult = await t.query(
      internal.feedback.validateFeedbackToken,
      { token: validToken }
    );
    expect(validResult.valid).toBe(true);

    // Expired token should be gone
    const expiredResult = await t.query(
      internal.feedback.validateFeedbackToken,
      { token: "expired_token_123" }
    );
    expect(expiredResult.valid).toBe(false);
    expect(expiredResult.reason).toBe("not_found");
  });
});
