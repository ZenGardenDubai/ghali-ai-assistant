"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Plus,
  Loader2,
  ChevronDown,
  Twitter,
  Check,
} from "lucide-react";

type Tone = "informative" | "casual" | "punchy";
type Format = "single" | "thread" | "with_image";
type Source = "github_pr" | "github_issue" | "github_release" | "manual";

interface FeatureItem {
  _id: string;
  title: string;
  description: string;
  source: Source;
  sourceUrl?: string;
  sourceRef?: string;
  status: string;
}

interface GeneratedPost {
  _id: string;
  content: string;
  format: Format;
  tone: Tone;
  hashtags: string[];
  variantIndex: number;
  status: string;
}

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: "informative", label: "Informative", desc: "Clear, factual, professional" },
  { value: "casual", label: "Casual", desc: "Friendly, conversational" },
  { value: "punchy", label: "Punchy", desc: "Short, bold, high-energy" },
];

const FORMAT_OPTIONS: { value: Format; label: string }[] = [
  { value: "single", label: "Single Tweet" },
  { value: "thread", label: "Thread" },
  { value: "with_image", label: "Tweet + Image" },
];

function GeneratePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillFeatureId = searchParams.get("featureId");

  // Feature form
  const [mode, setMode] = useState<"select" | "manual">("manual");
  const [pendingFeatures, setPendingFeatures] = useState<FeatureItem[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState(prefillFeatureId ?? "");
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [featureSource, setFeatureSource] = useState<Source>("manual");
  const [featureSourceUrl, setFeatureSourceUrl] = useState("");

  // Generation options
  const [tone, setTone] = useState<Tone>("informative");
  const [format, setFormat] = useState<Format>("single");

  // State
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedPost[]>([]);
  const [error, setError] = useState("");

  // Load pending features for the dropdown
  useEffect(() => {
    fetch("/api/admin/content-studio/feature-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data: FeatureItem[]) => {
        setPendingFeatures(data);
        if (prefillFeatureId) {
          const f = data.find((x) => x._id === prefillFeatureId);
          if (f) {
            setMode("select");
            setSelectedFeatureId(f._id);
            setFeatureTitle(f.title);
            setFeatureDescription(f.description);
          }
        }
      })
      .catch(() => {});
  }, [prefillFeatureId]);

  const handleSelectFeature = (id: string) => {
    setSelectedFeatureId(id);
    const f = pendingFeatures.find((x) => x._id === id);
    if (f) {
      setFeatureTitle(f.title);
      setFeatureDescription(f.description);
    }
  };

  const handleAddAndGenerate = async () => {
    if (!featureTitle.trim() || !featureDescription.trim()) {
      setError("Feature title and description are required.");
      return;
    }
    setError("");
    setSaving(true);

    try {
      let featureId = selectedFeatureId || undefined;

      // If manual mode, add to feature queue first
      if (mode === "manual" && !featureId) {
        const res = await fetch("/api/admin/content-studio/add-feature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: featureTitle.trim(),
            description: featureDescription.trim(),
            source: featureSource,
            sourceUrl: featureSourceUrl.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed to add feature");
        const data = await res.json();
        featureId = data.id;
      }

      setSaving(false);
      setGenerating(true);

      const genRes = await fetch("/api/admin/content-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureId,
          featureTitle: featureTitle.trim(),
          featureDescription: featureDescription.trim(),
          tone,
          format,
        }),
      });

      if (!genRes.ok) {
        const e = await genRes.json();
        throw new Error(e.error || "Generation failed");
      }

      const result = await genRes.json();
      if (!result.success) throw new Error("Generation returned no variants");

      // Fetch the generated posts
      const postsRes = await fetch("/api/admin/content-studio/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft", limit: 10 }),
      });
      if (postsRes.ok) {
        const allPosts = await postsRes.json();
        // Show only the ones just created
        const justCreated = allPosts.filter((p: GeneratedPost) =>
          result.postIds.includes(p._id)
        );
        setGenerated(justCreated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  };

  const handleGoToDrafts = () => router.push("/admin/content-studio/drafts");

  const isLoading = saving || generating;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Generate Content</h1>
        <p className="mt-1 text-sm text-white/50">
          Describe a Ghali feature and Claude Sonnet 4.6 will generate 3 tweet variants.
        </p>
      </div>

      {/* Source toggle */}
      <div className="flex gap-2">
        {(["manual", "select"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === m
                ? "bg-[#ED6B23]/10 text-[#ED6B23]"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {m === "manual" ? "Manual Input" : "Pending Features"}
            {m === "select" && pendingFeatures.length > 0 && (
              <span className="ml-2 rounded-full bg-[#ED6B23] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingFeatures.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Feature Input */}
        <div className="space-y-5">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="mb-4 text-sm font-semibold text-white/70">Feature Details</h2>

            {mode === "select" ? (
              <div className="space-y-3">
                <label className="block text-xs text-white/50">Select Pending Feature</label>
                <div className="relative">
                  <select
                    value={selectedFeatureId}
                    onChange={(e) => handleSelectFeature(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-[#ED6B23]/50 focus:outline-none"
                  >
                    <option value="">— Select a feature —</option>
                    {pendingFeatures.map((f) => (
                      <option key={f._id} value={f._id}>{f.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                </div>
                {selectedFeatureId && (
                  <p className="rounded-lg bg-white/[0.03] p-3 text-xs text-white/50">
                    {pendingFeatures.find((f) => f._id === selectedFeatureId)?.description}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs text-white/50">Feature Title *</label>
                  <input
                    type="text"
                    value={featureTitle}
                    onChange={(e) => setFeatureTitle(e.target.value)}
                    placeholder="e.g. Smart Calendar Integration"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#ED6B23]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-white/50">Description / Changelog Entry *</label>
                  <textarea
                    value={featureDescription}
                    onChange={(e) => setFeatureDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe what was shipped, what it does, and why users will love it…"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#ED6B23]/50 focus:outline-none resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs text-white/50">Source</label>
                    <div className="relative">
                      <select
                        value={featureSource}
                        onChange={(e) => setFeatureSource(e.target.value as Source)}
                        className="w-full appearance-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-[#ED6B23]/50 focus:outline-none"
                      >
                        <option value="manual">Manual</option>
                        <option value="github_pr">GitHub PR</option>
                        <option value="github_issue">GitHub Issue</option>
                        <option value="github_release">GitHub Release</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-white/50">Source URL (optional)</label>
                    <input
                      type="url"
                      value={featureSourceUrl}
                      onChange={(e) => setFeatureSourceUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#ED6B23]/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="mb-4 text-sm font-semibold text-white/70">Generation Options</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs text-white/50">Tone</label>
                <div className="grid grid-cols-3 gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`rounded-lg border p-2.5 text-left transition ${
                        tone === t.value
                          ? "border-[#ED6B23]/50 bg-[#ED6B23]/10 text-white"
                          : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                      }`}
                    >
                      <div className="text-xs font-medium">{t.label}</div>
                      <div className="mt-0.5 text-[10px] text-white/30">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs text-white/50">Format</label>
                <div className="flex gap-2">
                  {FORMAT_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFormat(f.value)}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${
                        format === f.value
                          ? "border-[#ED6B23]/50 bg-[#ED6B23]/10 text-white"
                          : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleAddAndGenerate}
            disabled={isLoading || (!featureTitle.trim() && !selectedFeatureId)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ED6B23] py-3 text-sm font-semibold text-white transition hover:bg-[#ED6B23]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {saving ? "Saving feature…" : "Generating with Claude…"}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate 3 Variants
              </>
            )}
          </button>
        </div>

        {/* Right: Generated Variants */}
        <div>
          {generated.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white/70">Generated Variants</h2>
                <button
                  onClick={handleGoToDrafts}
                  className="flex items-center gap-1.5 rounded-lg bg-[#ED6B23]/10 px-3 py-1.5 text-xs font-medium text-[#ED6B23] hover:bg-[#ED6B23]/20"
                >
                  <Check className="h-3.5 w-3.5" />
                  Review in Drafts
                </button>
              </div>
              {generated.map((post) => (
                <TweetPreviewCard key={post._id} post={post} />
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-center">
              <div>
                <Twitter className="mx-auto mb-3 h-8 w-8 text-white/20" />
                <p className="text-sm text-white/30">Tweet variants will appear here</p>
                <p className="mt-1 text-xs text-white/20">Fill in the feature details and click Generate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TweetPreviewCard({ post }: { post: GeneratedPost }) {
  const charCount = post.content.length;
  const isOver = charCount > 280;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white/40">
          Variant {(post.variantIndex ?? 0) + 1}
        </span>
        <span className={`text-xs font-mono ${isOver ? "text-red-400" : "text-white/30"}`}>
          {charCount}/280
        </span>
      </div>
      <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{post.content}</p>
      {post.hashtags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#ED6B23]/10 px-2 py-0.5 text-[10px] text-[#ED6B23]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense>
      <GeneratePageInner />
    </Suspense>
  );
}
