/**
 * RAG (Retrieval-Augmented Generation) — document indexing and search.
 *
 * Uses @convex-dev/rag with per-user namespaces.
 * Documents are auto-chunked and embedded via text-embedding-3-small.
 *
 * NOTE: @convex-dev/rag@0.7.1 requires ai@^6, but we use ai@5 (for @convex-dev/agent).
 * To avoid the "V.warnings is not iterable" crash, we pre-compute embeddings
 * ourselves using ai@5's embedMany/embed, then pass pre-embedded chunks to RAG.
 */

import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { RAG, defaultChunker } from "@convex-dev/rag";
import { embed, embedMany } from "ai";
import { MODELS } from "./models";

const embeddingModel = openai.embedding(MODELS.EMBEDDING);

export const rag = new RAG(components.rag, {
  textEmbeddingModel: embeddingModel,
  embeddingDimension: 1536,
});

/**
 * Index a document into the user's RAG namespace.
 * Pre-chunks and pre-embeds to avoid ai@5/ai@6 incompatibility in RAG library.
 */
export const indexDocument = internalAction({
  args: {
    userId: v.string(),
    text: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { userId, text, title }) => {
    try {
      console.log(
        `[RAG] indexing | user: ${userId} | title: ${title} | length: ${text.length}`
      );

      // Chunk text using RAG's default chunker, filter out empty chunks
      const textChunks = defaultChunker(text).filter(
        (c) => c.trim().length > 0
      );
      if (textChunks.length === 0) {
        console.log("[RAG] no non-empty chunks — skipping");
        return;
      }

      // Pre-compute embeddings with ai@5
      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: textChunks.map((c) => c.trim()),
      });

      // Build pre-embedded chunks for rag.add()
      const chunks = textChunks.map((chunkText, i) => {
        const emb = embeddings[i];
        if (!emb) throw new Error(`Missing embedding for chunk ${i}`);
        return { text: chunkText, embedding: emb };
      });

      await rag.add(ctx, {
        namespace: userId,
        key: title,
        title,
        chunks,
      });

      console.log(
        `[RAG] indexed | user: ${userId} | title: ${title} | chunks: ${chunks.length}`
      );
    } catch (error) {
      console.error("[RAG] indexDocument failed:", error);
    }
  },
});

/**
 * Search the user's indexed documents.
 * Pre-embeds query to avoid ai@5/ai@6 incompatibility in RAG library.
 * Returns formatted text from matching chunks, or a "no documents" message.
 */
export const searchDocuments = internalAction({
  args: {
    userId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, { userId, query, limit }) => {
    try {
      console.log(
        `[RAG] searching | user: ${userId} | query: "${query.slice(0, 50)}"`
      );

      // Pre-compute query embedding with ai@5
      const { embedding } = await embed({
        model: embeddingModel,
        value: query,
      });

      // Pass pre-computed embedding array to rag.search()
      const { text, results } = await rag.search(ctx, {
        namespace: userId,
        query: embedding,
        limit: limit ?? 5,
      });

      if (results.length === 0 || !text.trim()) {
        return "No documents found matching your query.";
      }

      console.log(
        `[RAG] found ${results.length} results | user: ${userId}`
      );

      return text;
    } catch (error) {
      // rag.search() crashes on empty namespaces with:
      // "Cannot read properties of undefined (reading 'length')"
      // This is a library bug — treat it as "no documents".
      if (
        error instanceof TypeError &&
        error.message.includes("reading 'length'")
      ) {
        console.log(`[RAG] no documents indexed for user: ${userId}`);
        return "No documents found. The user hasn't uploaded any files yet.";
      }
      console.error("[RAG] searchDocuments failed:", error);
      return "Document search failed. Please try again.";
    }
  },
});

/**
 * Get the count of RAG documents in a user's namespace.
 * Returns 0 if no namespace exists.
 *
 * NOTE: Uses internal @convex-dev/rag component APIs (namespaces.get, entries.list)
 * since the library doesn't expose a public count method. May break on library updates.
 */
export const getDocumentCount = internalQuery({
  args: { userId: v.string() },
  returns: v.number(),
  handler: async (ctx, { userId }) => {
    try {
      // Look up namespace for this user
      const ns = await ctx.runQuery(components.rag.namespaces.get, {
        namespace: userId,
        dimension: 1536,
        filterNames: [],
        modelId: MODELS.EMBEDDING,
      });
      if (!ns) return 0;

      // Count entries in this namespace by paginating
      let count = 0;
      let cursor: string | null = null;
      let isDone = false;
      while (!isDone) {
        const page: { page: Array<{ status: string }>; isDone: boolean; continueCursor: string } =
          await ctx.runQuery(components.rag.entries.list, {
            namespaceId: ns.namespaceId,
            status: "ready",
            paginationOpts: { cursor, numItems: 1000 },
          });
        count += page.page.length;
        isDone = page.isDone;
        cursor = page.continueCursor;
      }
      return count;
    } catch {
      return 0;
    }
  },
});

/**
 * Delete all RAG documents in a user's namespace.
 * No-op if namespace doesn't exist. Errors propagate to caller.
 *
 * NOTE: Uses internal @convex-dev/rag component APIs. May break on library updates.
 * We manually delete entries before namespace because the library's deleteNamespaceSync
 * has a pagination bug that skips entries on the last page.
 */
export const deleteUserNamespace = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Look up namespace
    const ns = await ctx.runQuery(components.rag.namespaces.get, {
      namespace: userId,
      dimension: 1536,
      filterNames: [],
      modelId: MODELS.EMBEDDING,
    });
    if (!ns) {
      console.log(`[RAG] no namespace for user ${userId} — nothing to delete`);
      return;
    }

    // Delete all entries in the namespace across all statuses
    const statuses = ["pending", "ready", "replaced"] as const;
    for (const status of statuses) {
      let cursor: string | null = null;
      let isDone = false;
      while (!isDone) {
        const page: { page: Array<{ entryId: string }>; isDone: boolean; continueCursor: string } =
          await ctx.runQuery(components.rag.entries.list, {
            namespaceId: ns.namespaceId,
            status,
            paginationOpts: { cursor, numItems: 100 },
          });

        // Delete each entry (deleteSync removes entry + its chunks)
        for (const entry of page.page) {
          await ctx.runAction(components.rag.entries.deleteSync, {
            entryId: entry.entryId,
          });
        }

        isDone = page.isDone;
        cursor = page.continueCursor;
      }
    }

    // Now safe to delete the empty namespace
    await ctx.runMutation(components.rag.namespaces.deleteNamespace, {
      namespaceId: ns.namespaceId,
    });
    console.log(`[RAG] deleted namespace for user ${userId}`);
  },
});
