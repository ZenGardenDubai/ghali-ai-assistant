"use client";

import { useState, useEffect, useCallback } from "react";
import { Twitter, RefreshCw, Loader2, ExternalLink } from "lucide-react";

interface ContentPost {
  _id: string;
  content: string;
  format: "single" | "thread" | "with_image";
  tone: "informative" | "casual" | "punchy";
  hashtags: string[];
  imageUrl?: string | null;
  typefullyId?: string;
  scheduledAt?: number;
  status: string;
  createdAt: number;
  updatedAt: number;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PublishedPage() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content-studio/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published", limit: 50 }),
      });
      if (res.ok) setPosts(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Published Posts</h1>
          <p className="mt-1 text-sm text-white/50">History of tweets published via Typefully</p>
        </div>
        <button
          onClick={loadPosts}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/50 transition hover:border-white/20 hover:text-white/70"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-10 text-center">
          <Twitter className="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p className="text-sm text-white/30">No published posts yet.</p>
          <p className="mt-1 text-xs text-white/20">
            Posts will appear here after Typefully publishes them and the webhook fires.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post._id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#ED6B23]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#ED6B23]">
                    published
                  </span>
                  <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/30">
                    {post.format}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {post.typefullyId && (
                    <a
                      href={`https://typefully.com/drafts/${post.typefullyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Typefully
                    </a>
                  )}
                  <span className="text-xs text-white/25">{formatDate(post.updatedAt)}</span>
                </div>
              </div>

              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>

              {post.hashtags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {post.hashtags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#ED6B23]/10 px-2 py-0.5 text-[10px] text-[#ED6B23]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {post.imageUrl && (
                <div className="mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.imageUrl}
                    alt="Tweet image"
                    className="rounded-lg max-h-40 object-cover border border-white/10"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
