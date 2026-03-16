"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  Loader2,
  Twitter,
  Edit3,
  Trash2,
  Calendar,
} from "lucide-react";

type PostStatus = "draft" | "approved" | "scheduled" | "published" | "rejected";

interface ContentPost {
  _id: string;
  content: string;
  format: "single" | "thread" | "with_image";
  tone: "informative" | "casual" | "punchy";
  hashtags: string[];
  imageUrl?: string | null;
  typefullyId?: string;
  scheduledAt?: number;
  status: PostStatus;
  variantIndex?: number;
  adminNotes?: string;
  createdAt: number;
  updatedAt: number;
}

const STATUS_TABS: { value: PostStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_COLORS: Record<PostStatus, string> = {
  draft: "text-blue-400 bg-blue-400/10",
  approved: "text-green-400 bg-green-400/10",
  scheduled: "text-purple-400 bg-purple-400/10",
  published: "text-[#ED6B23] bg-[#ED6B23]/10",
  rejected: "text-red-400 bg-red-400/10",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DraftsPage() {
  const [activeTab, setActiveTab] = useState<PostStatus | "all">("draft");
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content-studio/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          activeTab === "all" ? { limit: 50 } : { status: activeTab, limit: 50 }
        ),
      });
      if (res.ok) setPosts(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const updateStatus = async (postId: string, status: PostStatus) => {
    setActionLoading(postId + status);
    try {
      const res = await fetch("/api/admin/content-studio/update-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, status }),
      });
      if (!res.ok) throw new Error("Update failed");
      await loadPosts();
    } catch {
      setError("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const saveEdit = async (postId: string) => {
    setActionLoading(postId + "edit");
    try {
      const res = await fetch("/api/admin/content-studio/update-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: editContent, adminNotes: editNotes }),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditingId(null);
      await loadPosts();
    } catch {
      setError("Failed to save edits");
    } finally {
      setActionLoading(null);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this draft?")) return;
    setActionLoading(postId + "delete");
    try {
      const res = await fetch("/api/admin/content-studio/delete-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      await loadPosts();
    } catch {
      setError("Failed to delete post");
    } finally {
      setActionLoading(null);
    }
  };

  const pushToTypefully = async (postId: string, scheduledAt?: number) => {
    setActionLoading(postId + "typefully");
    setError("");
    try {
      const res = await fetch("/api/admin/content-studio/push-typefully", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, scheduledAt }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Push failed");
      }
      setSchedulingId(null);
      await loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to push to Typefully");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSchedule = async (postId: string) => {
    if (!scheduleDate) return;
    const scheduledAt = new Date(scheduleDate).getTime();
    await pushToTypefully(postId, scheduledAt);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Drafts & Approvals</h1>
          <p className="mt-1 text-sm text-white/50">Review, edit, and approve generated tweet drafts</p>
        </div>
        <button
          onClick={loadPosts}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/50 transition hover:border-white/20 hover:text-white/70"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-300 hover:text-red-200">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === tab.value
                ? "border-[#ED6B23] text-[#ED6B23]"
                : "border-transparent text-white/40 hover:text-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-10 text-center">
          <Twitter className="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p className="text-sm text-white/30">No {activeTab === "all" ? "" : activeTab} posts found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post._id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
            >
              {/* Top row: status + format + date */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_COLORS[post.status]}`}>
                    {post.status}
                  </span>
                  <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/30">
                    {post.format}
                  </span>
                  <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/30">
                    {post.tone}
                  </span>
                </div>
                <span className="text-xs text-white/25">{formatDate(post.createdAt)}</span>
              </div>

              {/* Content */}
              {editingId === post._id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-[#ED6B23]/30 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:outline-none resize-none"
                  />
                  <div className={`text-right text-xs ${editContent.length > 280 ? "text-red-400" : "text-white/30"}`}>
                    {editContent.length}/280
                  </div>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    placeholder="Admin notes (optional)…"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white/60 placeholder-white/20 focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(post._id)}
                      disabled={actionLoading === post._id + "edit"}
                      className="flex items-center gap-1.5 rounded-lg bg-[#ED6B23]/10 px-3 py-1.5 text-xs font-medium text-[#ED6B23] hover:bg-[#ED6B23]/20 disabled:opacity-50"
                    >
                      {actionLoading === post._id + "edit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg px-3 py-1.5 text-xs text-white/40 hover:text-white/60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              )}

              {/* Hashtags */}
              {post.hashtags.length > 0 && editingId !== post._id && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {post.hashtags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#ED6B23]/10 px-2 py-0.5 text-[10px] text-[#ED6B23]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Image preview */}
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

              {/* Schedule picker */}
              {schedulingId === post._id && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-purple-400/20 bg-purple-400/[0.05] p-3">
                  <Calendar className="h-4 w-4 text-purple-400 shrink-0" />
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                  />
                  <button
                    onClick={() => handleSchedule(post._id)}
                    disabled={!scheduleDate || actionLoading === post._id + "typefully"}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-400/10 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-400/20 disabled:opacity-50"
                  >
                    {actionLoading === post._id + "typefully" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                    Schedule
                  </button>
                  <button onClick={() => setSchedulingId(null)} className="text-white/30 hover:text-white/50">✕</button>
                </div>
              )}

              {/* Admin notes */}
              {post.adminNotes && editingId !== post._id && (
                <p className="mt-2 text-xs text-white/30 italic">{post.adminNotes}</p>
              )}

              {/* Typefully ID */}
              {post.typefullyId && (
                <p className="mt-2 text-xs text-white/20">Typefully ID: {post.typefullyId}</p>
              )}

              {/* Action buttons */}
              {editingId !== post._id && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.04] pt-4">
                  {/* Approve */}
                  {(post.status === "draft" || post.status === "rejected") && (
                    <button
                      onClick={() => updateStatus(post._id, "approved")}
                      disabled={actionLoading === post._id + "approved"}
                      className="flex items-center gap-1.5 rounded-lg bg-green-400/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-400/20 disabled:opacity-50"
                    >
                      {actionLoading === post._id + "approved" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Approve
                    </button>
                  )}

                  {/* Reject */}
                  {(post.status === "draft" || post.status === "approved") && (
                    <button
                      onClick={() => updateStatus(post._id, "rejected")}
                      disabled={actionLoading === post._id + "rejected"}
                      className="flex items-center gap-1.5 rounded-lg bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/20 disabled:opacity-50"
                    >
                      {actionLoading === post._id + "rejected" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Reject
                    </button>
                  )}

                  {/* Post Now (push to Typefully without schedule) */}
                  {(post.status === "draft" || post.status === "approved") && (
                    <button
                      onClick={() => pushToTypefully(post._id)}
                      disabled={actionLoading === post._id + "typefully"}
                      className="flex items-center gap-1.5 rounded-lg bg-[#ED6B23]/10 px-3 py-1.5 text-xs font-medium text-[#ED6B23] hover:bg-[#ED6B23]/20 disabled:opacity-50"
                    >
                      {actionLoading === post._id + "typefully" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Push to Typefully
                    </button>
                  )}

                  {/* Schedule */}
                  {(post.status === "draft" || post.status === "approved") && schedulingId !== post._id && (
                    <button
                      onClick={() => { setSchedulingId(post._id); setScheduleDate(""); }}
                      className="flex items-center gap-1.5 rounded-lg bg-purple-400/10 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-400/20"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Schedule
                    </button>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => { setEditingId(post._id); setEditContent(post.content); setEditNotes(post.adminNotes ?? ""); }}
                    className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/40 hover:bg-white/[0.07] hover:text-white/60"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deletePost(post._id)}
                    disabled={actionLoading === post._id + "delete"}
                    className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-400/5 px-3 py-1.5 text-xs font-medium text-red-400/60 hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
                  >
                    {actionLoading === post._id + "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
