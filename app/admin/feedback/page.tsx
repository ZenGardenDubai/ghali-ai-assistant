"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Types
interface Feedback {
  _id: string;
  phone: string;
  category: "bug" | "feature_request" | "general";
  message: string;
  source: "whatsapp_link" | "web" | "agent_tool";
  status: "new" | "read" | "in_progress" | "resolved" | "archived";
  adminNotes?: string;
  createdAt: number;
  updatedAt: number;
}

interface Stats {
  new: number;
  read: number;
  in_progress: number;
  resolved: number;
  archived: number;
}

type Status = Feedback["status"];
type Category = Feedback["category"];

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  { value: "read", label: "Read", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  { value: "in_progress", label: "In Progress", color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  { value: "resolved", label: "Resolved", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  { value: "archived", label: "Archived", color: "bg-white/10 text-white/40 border-white/10" },
];

const CATEGORY_LABELS: Record<Category, { label: string; emoji: string }> = {
  bug: { label: "Bug", emoji: "🐛" },
  feature_request: { label: "Feature", emoji: "💡" },
  general: { label: "General", emoji: "💬" },
};

const SOURCE_LABELS: Record<string, string> = {
  whatsapp_link: "WhatsApp Link",
  web: "Web",
  agent_tool: "Agent",
};

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function AdminFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<Status | "">("");
  const [filterCategory, setFilterCategory] = useState<Category | "">("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [feedbackRes, statsRes] = await Promise.all([
        fetch("/api/admin/feedback/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(filterStatus && { status: filterStatus }),
            ...(filterCategory && { category: filterCategory }),
          }),
        }),
        fetch("/api/admin/feedback/stats", { method: "POST" }),
      ]);

      if (feedbackRes.ok) {
        const data = await feedbackRes.json();
        setFeedbackList(data);
        // Initialize notes map
        const notes: Record<string, string> = {};
        for (const f of data as Feedback[]) {
          notes[f._id] = f.adminNotes ?? "";
        }
        setNotesMap(notes);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch feedback:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleStatusChange(feedbackId: string, newStatus: Status) {
    try {
      const res = await fetch("/api/admin/feedback/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, status: newStatus }),
      });
      if (!res.ok) console.error("Failed to update status:", await res.text());
      fetchData();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  async function handleSaveNotes(feedbackId: string) {
    setSavingNotes(feedbackId);
    try {
      const res = await fetch("/api/admin/feedback/update-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, notes: notesMap[feedbackId] ?? "" }),
      });
      if (!res.ok) console.error("Failed to save notes:", await res.text());
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setSavingNotes(null);
    }
  }

  async function handleReply(feedbackId: string) {
    const msg = replyMap[feedbackId]?.trim();
    if (!msg) return;
    setReplyingId(feedbackId);
    try {
      const res = await fetch("/api/admin/feedback/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, message: msg }),
      });
      if (!res.ok) console.error("Reply failed:", await res.text());
      setReplyMap((prev) => ({ ...prev, [feedbackId]: "" }));
    } catch (err) {
      console.error("Reply failed:", err);
    } finally {
      setReplyingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Feedback</h1>
        <p className="mt-1 text-sm text-white/40">
          User feedback, bug reports, and feature requests
        </p>
      </div>

      {/* Stats bar */}
      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STATUS_OPTIONS.map((s) => (
            <Card
              key={s.value}
              className="cursor-pointer border-white/[0.06] bg-white/[0.02] transition-colors hover:bg-white/[0.04]"
              onClick={() => setFilterStatus(filterStatus === s.value ? "" : s.value)}
            >
              <CardContent className="flex items-center justify-between p-3">
                <span className="text-xs font-medium text-white/50">{s.label}</span>
                <Badge variant="outline" className={`${s.color} border text-xs`}>
                  {stats[s.value]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as Status | "")}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/70 outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as Category | "")}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/70 outline-none"
        >
          <option value="">All Categories</option>
          <option value="bug">Bug</option>
          <option value="feature_request">Feature Request</option>
          <option value="general">General</option>
        </select>
      </div>

      {/* Feedback list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/30">No feedback found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbackList.map((fb) => {
            const isExpanded = expandedId === fb._id;
            const catInfo = CATEGORY_LABELS[fb.category];
            const statusInfo = STATUS_OPTIONS.find((s) => s.value === fb.status) ?? STATUS_OPTIONS[0]!;

            return (
              <div
                key={fb._id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] transition-colors"
              >
                {/* Summary row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : fb._id)}
                  className="flex w-full items-start gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-white/50">{fb.phone}</span>
                      <Badge variant="outline" className="border-white/10 text-[10px] text-white/40">
                        {catInfo.emoji} {catInfo.label}
                      </Badge>
                      <Badge variant="outline" className="border-white/10 text-[10px] text-white/40">
                        {SOURCE_LABELS[fb.source] ?? fb.source}
                      </Badge>
                      <Badge variant="outline" className={`${statusInfo.color} border text-[10px]`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/70 line-clamp-2">
                      {fb.message}
                    </p>
                    <p className="mt-1 text-[10px] text-white/25">
                      {formatRelativeTime(fb.createdAt)}
                    </p>
                  </div>
                  <svg
                    className={`h-4 w-4 flex-shrink-0 text-white/20 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-4 space-y-4">
                    {/* Full message */}
                    <div>
                      <label className="block text-[10px] font-medium uppercase tracking-wider text-white/30 mb-1">
                        Full Message
                      </label>
                      <p className="text-sm text-white/70 whitespace-pre-wrap">
                        {fb.message}
                      </p>
                    </div>

                    {/* Status dropdown */}
                    <div>
                      <label className="block text-[10px] font-medium uppercase tracking-wider text-white/30 mb-1">
                        Status
                      </label>
                      <select
                        value={fb.status}
                        onChange={(e) => handleStatusChange(fb._id, e.target.value as Status)}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/70 outline-none"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Admin notes */}
                    <div>
                      <label className="block text-[10px] font-medium uppercase tracking-wider text-white/30 mb-1">
                        Internal Notes
                      </label>
                      <textarea
                        value={notesMap[fb._id] ?? ""}
                        onChange={(e) =>
                          setNotesMap((prev) => ({ ...prev, [fb._id]: e.target.value }))
                        }
                        rows={2}
                        placeholder="Add internal notes..."
                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/70 placeholder-white/20 outline-none resize-none"
                      />
                      <button
                        onClick={() => handleSaveNotes(fb._id)}
                        disabled={savingNotes === fb._id}
                        className="mt-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-[10px] font-medium text-white/50 transition-colors hover:bg-white/[0.1] hover:text-white/70 disabled:opacity-50"
                      >
                        {savingNotes === fb._id ? "Saving..." : "Save Notes"}
                      </button>
                    </div>

                    {/* Reply via WhatsApp */}
                    <div>
                      <label className="block text-[10px] font-medium uppercase tracking-wider text-white/30 mb-1">
                        Reply via WhatsApp
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyMap[fb._id] ?? ""}
                          onChange={(e) => setReplyMap((prev) => ({ ...prev, [fb._id]: e.target.value }))}
                          placeholder="Type a reply..."
                          className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/70 placeholder-white/20 outline-none"
                        />
                        <button
                          onClick={() => handleReply(fb._id)}
                          disabled={replyingId === fb._id || !(replyMap[fb._id]?.trim())}
                          className="rounded-lg bg-[#ED6B23] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#d45e1f] disabled:opacity-40"
                        >
                          {replyingId === fb._id ? "..." : "Send"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
