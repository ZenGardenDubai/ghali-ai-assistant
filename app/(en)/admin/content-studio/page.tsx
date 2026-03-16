"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  RefreshCw,
  Twitter,
  ArrowRight,
} from "lucide-react";

interface Stats {
  drafts: number;
  approved: number;
  scheduled: number;
  published: number;
  rejected: number;
  pendingFeatures: number;
  doneFeatures: number;
}

interface FeatureItem {
  _id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl?: string;
  status: string;
  createdAt: number;
}

const STAT_CARDS = [
  { label: "Pending Features", key: "pendingFeatures", icon: Clock, color: "text-yellow-400" },
  { label: "Drafts", key: "drafts", icon: FileText, color: "text-blue-400" },
  { label: "Approved", key: "approved", icon: CheckCircle2, color: "text-green-400" },
  { label: "Scheduled", key: "scheduled", icon: Clock, color: "text-purple-400" },
  { label: "Published", key: "published", icon: Send, color: "text-[#ED6B23]" },
] as const;

const QUICK_LINKS = [
  { href: "/admin/content-studio/generate", label: "Generate Content", icon: Sparkles, desc: "Create tweet variants for a feature" },
  { href: "/admin/content-studio/drafts", label: "Review Drafts", icon: FileText, desc: "Approve, edit, or schedule posts" },
  { href: "/admin/content-studio/published", label: "Published Posts", icon: Twitter, desc: "View history of published tweets" },
  { href: "/admin/content-studio/settings", label: "Settings", icon: RefreshCw, desc: "Configure Typefully API & defaults" },
];

export default function ContentStudioDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingFeatures, setPendingFeatures] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, featuresRes] = await Promise.all([
        fetch("/api/admin/content-studio/stats", { method: "POST" }),
        fetch("/api/admin/content-studio/feature-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "pending", limit: 5 }),
        }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (featuresRes.ok) setPendingFeatures(await featuresRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Studio</h1>
          <p className="mt-1 text-sm text-white/50">AI-powered tweet drafting with admin approval workflow</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/50 transition hover:border-white/20 hover:text-white/70"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_CARDS.map(({ label, key, icon: Icon, color }) => (
          <div
            key={key}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-white/40">{label}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {loading ? "—" : (stats?.[key] ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/30">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_LINKS.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-[#ED6B23]/30 hover:bg-[#ED6B23]/[0.04]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ED6B23]/10">
                <Icon className="h-5 w-5 text-[#ED6B23]" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="text-xs text-white/40">{desc}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-white/20 transition group-hover:text-[#ED6B23]/60" />
            </Link>
          ))}
        </div>
      </div>

      {/* Pending Features */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/30">
            Pending Features ({stats?.pendingFeatures ?? 0})
          </h2>
          <Link
            href="/admin/content-studio/generate"
            className="flex items-center gap-1.5 text-xs text-[#ED6B23] hover:text-[#ED6B23]/80"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Feature
          </Link>
        </div>
        {loading ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-white/30">
            Loading…
          </div>
        ) : pendingFeatures.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-white/30">No pending features. Add one to get started.</p>
            <Link
              href="/admin/content-studio/generate"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#ED6B23]/10 px-4 py-2 text-sm font-medium text-[#ED6B23] hover:bg-[#ED6B23]/20"
            >
              <Plus className="h-4 w-4" />
              Add Feature
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] rounded-xl border border-white/[0.06] bg-white/[0.02]">
            {pendingFeatures.map((feature) => (
              <div key={feature._id} className="flex items-start justify-between gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{feature.title}</span>
                    <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/40">
                      {feature.source.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/40 line-clamp-1">{feature.description}</p>
                </div>
                <Link
                  href={`/admin/content-studio/generate?featureId=${feature._id}`}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#ED6B23]/10 px-3 py-1.5 text-xs font-medium text-[#ED6B23] hover:bg-[#ED6B23]/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
