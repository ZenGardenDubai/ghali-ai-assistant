"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Trash2, Loader2, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";

interface OnboardingConfig {
  storageId: string;
  url: string;
  enabled: boolean;
}

export default function OnboardingPage() {
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Local state for unsaved changes
  const [localEnabled, setLocalEnabled] = useState(true);
  const [localImage, setLocalImage] = useState<{ storageId: string; url: string } | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/onboarding");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data) {
          setLocalEnabled(data.enabled);
          setLocalImage({ storageId: data.storageId, url: data.url });
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setResult({ success: false, error: data.error || "Upload failed" });
        return;
      }
      const { url, storageId } = await res.json();
      setLocalImage({ storageId, url });
      setResult(null);
    } catch {
      setResult({ success: false, error: "Upload failed" });
    } finally {
      setUploading(false);
      // Reset input so re-uploading the same file triggers onChange
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!localImage) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageId: localImage.storageId,
          url: localImage.url,
          enabled: localEnabled,
        }),
      });
      if (res.ok) {
        setConfig({ ...localImage, enabled: localEnabled });
        setResult({ success: true });
      } else {
        const data = await res.json();
        setResult({ success: false, error: data.error || "Save failed" });
      }
    } catch {
      setResult({ success: false, error: "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/onboarding", { method: "DELETE" });
      if (res.ok) {
        setConfig(null);
        setLocalImage(null);
        setLocalEnabled(true);
        setResult({ success: true });
      } else {
        setResult({ success: false, error: "Delete failed" });
      }
    } catch {
      setResult({ success: false, error: "Delete failed" });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    localImage?.storageId !== config?.storageId ||
    localImage?.url !== config?.url ||
    localEnabled !== config?.enabled;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Onboarding</h1>
          <p className="mt-1 text-sm text-white/50">Manage the infographic sent to new users</p>
        </div>
        <Skeleton className="h-64 w-full rounded-xl bg-white/[0.04]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Onboarding</h1>
        <p className="mt-1 text-sm text-white/50">
          Manage the infographic sent to new users before the welcome message
        </p>
      </div>

      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white/80">
            <ImageIcon className="h-4 w-4 text-[#ED6B23]" />
            Onboarding Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image preview / upload */}
          {localImage ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={localImage.url}
                  alt="Onboarding infographic"
                  className="mx-auto max-h-[400px] object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="upload-replace" className="cursor-pointer">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
                    asChild
                  >
                    <span>
                      <Upload className="mr-2 h-3.5 w-3.5" />
                      Replace
                    </span>
                  </Button>
                </Label>
                <input
                  id="upload-replace"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="upload-new"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-white/10 bg-white/[0.01] py-12 transition-colors hover:border-[#ED6B23]/30 hover:bg-white/[0.02]"
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-[#ED6B23]/60" />
              ) : (
                <Upload className="h-8 w-8 text-white/20" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-white/60">
                  {uploading ? "Uploading..." : "Click to upload image"}
                </p>
                <p className="mt-1 text-xs text-white/30">PNG, JPG, WebP (max 5MB)</p>
              </div>
              <input
                id="upload-new"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          )}

          {/* Enabled toggle */}
          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.01] px-4 py-3">
            <div>
              <Label className="text-sm font-medium text-white/80">
                Send to new users
              </Label>
              <p className="mt-0.5 text-xs text-white/40">
                When enabled, new users receive this image before the welcome message
              </p>
            </div>
            <Switch
              checked={localEnabled}
              onCheckedChange={setLocalEnabled}
              disabled={!localImage}
            />
          </div>

          {/* Save button */}
          {localImage && hasChanges && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#ED6B23] text-white hover:bg-[#ED6B23]/90"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          )}

          {/* Result feedback */}
          {result && (
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                result.success
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              {result.success ? "Saved successfully" : result.error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
