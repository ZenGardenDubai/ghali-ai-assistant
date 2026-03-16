"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

interface Settings {
  content_studio_typefully_api_key: string;
  content_studio_default_tone: string;
  content_studio_default_hashtags: string;
  content_studio_twitter_handle: string;
}

const TONE_OPTIONS = [
  { value: "informative", label: "Informative" },
  { value: "casual", label: "Casual" },
  { value: "punchy", label: "Punchy" },
];

export default function ContentStudioSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    content_studio_typefully_api_key: "",
    content_studio_default_tone: "informative",
    content_studio_default_hashtags: "#AI #WhatsApp #Productivity",
    content_studio_twitter_handle: "@GhaliAI",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    fetch("/api/admin/content-studio/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get" }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setSettings((prev) => ({
            ...prev,
            ...Object.fromEntries(
              Object.entries(data).filter(([, v]) => v !== "")
            ),
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/content-studio/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          typefullyApiKey: settings.content_studio_typefully_api_key || undefined,
          defaultTone: settings.content_studio_default_tone || undefined,
          defaultHashtags: settings.content_studio_default_hashtags || undefined,
          twitterHandle: settings.content_studio_twitter_handle || undefined,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Content Studio Settings</h1>
        <p className="mt-1 text-sm text-white/50">Configure Typefully API, default tone, and hashtag presets</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        {/* Typefully API Key */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">
            Typefully API Key
          </label>
          <p className="mb-2 text-xs text-white/40">
            Found in your Typefully account under Settings → API. Required to push drafts and schedule tweets.
          </p>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={settings.content_studio_typefully_api_key}
              onChange={(e) =>
                setSettings((s) => ({ ...s, content_studio_typefully_api_key: e.target.value }))
              }
              placeholder="ty_live_xxxxxxxxxxxxxxxxxxxx"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:border-[#ED6B23]/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Twitter Handle */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">Twitter Handle</label>
          <input
            type="text"
            value={settings.content_studio_twitter_handle}
            onChange={(e) =>
              setSettings((s) => ({ ...s, content_studio_twitter_handle: e.target.value }))
            }
            placeholder="@GhaliAI"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#ED6B23]/50 focus:outline-none"
          />
        </div>

        {/* Default Tone */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white/70">Default Tone</label>
          <div className="flex gap-2">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() =>
                  setSettings((s) => ({ ...s, content_studio_default_tone: t.value }))
                }
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                  settings.content_studio_default_tone === t.value
                    ? "border-[#ED6B23]/50 bg-[#ED6B23]/10 text-white"
                    : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Default Hashtags */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">Default Hashtags</label>
          <p className="mb-2 text-xs text-white/40">
            Space-separated hashtags to suggest when generating tweets.
          </p>
          <input
            type="text"
            value={settings.content_studio_default_hashtags}
            onChange={(e) =>
              setSettings((s) => ({ ...s, content_studio_default_hashtags: e.target.value }))
            }
            placeholder="#AI #WhatsApp #Productivity #UAE"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#ED6B23]/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Typefully Webhook Info */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-2 text-sm font-semibold text-white/70">Typefully Webhook</h2>
        <p className="text-xs text-white/40 mb-3">
          To automatically mark posts as published, configure this webhook URL in your Typefully account under Settings → Webhooks:
        </p>
        <code className="block rounded-lg bg-black/30 px-3 py-2.5 text-xs text-[#ED6B23] break-all">
          {typeof window !== "undefined"
            ? `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "https://your-convex-site.convex.site"}/typefully-webhook`
            : "https://your-convex-site.convex.site/typefully-webhook"}
        </code>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-[#ED6B23] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ED6B23]/90 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saving ? "Saving…" : saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
