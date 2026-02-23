"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Send, Radio, TestTube, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface TemplateInfo {
  key: string;
  name: string;
  description: string;
  variables: string[];
  preview: string;
  configured: boolean;
}

type SendResult = { success: boolean; error?: string; sentCount?: number };

function renderPreview(preview: string, variables: string[], values: Record<string, string>): string {
  let rendered = preview;
  variables.forEach((_, i) => {
    const placeholder = `{{${i + 1}}}`;
    const value = values[variables[i]] || `{{${i + 1}}}`;
    rendered = rendered.replace(placeholder, value);
  });
  return rendered;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateInfo[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [activeUserCount, setActiveUserCount] = useState<number>(0);

  // Send state
  const [adminPhone, setAdminPhone] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/template-status", { method: "POST" });
    if (res.ok) {
      const data: TemplateInfo[] = await res.json();
      setTemplates(data);
      if (data.length > 0 && !selected) setSelected(data[0].key);
    }
  }, [selected]);

  const fetchActiveCount = useCallback(async () => {
    const res = await fetch("/api/admin/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period: "today" }),
    });
    if (res.ok) {
      const data = await res.json();
      setActiveUserCount(data.activeUsers ?? 0);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchActiveCount();
  }, [fetchTemplates, fetchActiveCount]);

  const selectedTemplate = templates?.find((t) => t.key === selected);

  // Reset variables when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const fresh: Record<string, string> = {};
      selectedTemplate.variables.forEach((v) => (fresh[v] = ""));
      setVariables(fresh);
      setResult(null);
    }
  }, [selected, selectedTemplate]);

  // Build ContentVariables as {"1": "val", "2": "val"}
  function buildContentVariables(): Record<string, string> {
    if (!selectedTemplate) return {};
    const cv: Record<string, string> = {};
    selectedTemplate.variables.forEach((v, i) => {
      cv[String(i + 1)] = variables[v] || "";
    });
    return cv;
  }

  async function handleSend(mode: "test" | "user" | "broadcast") {
    if (!selectedTemplate) return;
    setSending(mode);
    setResult(null);

    const contentVars = buildContentVariables();
    let endpoint: string;
    let body: Record<string, unknown>;

    switch (mode) {
      case "test":
        endpoint = "/api/admin/send-test-template";
        body = { templateEnvVar: selected, variables: contentVars, adminPhone };
        break;
      case "user":
        endpoint = "/api/admin/send-template";
        body = { templateEnvVar: selected, variables: contentVars, phone: userPhone };
        break;
      case "broadcast":
        endpoint = "/api/admin/send-template-broadcast";
        body = { templateEnvVar: selected, variables: contentVars };
        break;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(res.ok ? { success: true, sentCount: data.sentCount } : { success: false, error: data.error || "Failed" });
    } catch {
      setResult({ success: false, error: "Network error" });
    } finally {
      setSending(null);
    }
  }

  const preview = selectedTemplate
    ? renderPreview(selectedTemplate.preview, selectedTemplate.variables, variables)
    : "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Template Messages</h1>
        <p className="mt-1 text-sm text-white/40">
          Send pre-approved WhatsApp Content Templates to users
        </p>
      </div>

      {templates === null ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full bg-white/[0.04]" />
          <Skeleton className="h-48 w-full bg-white/[0.04]" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: Template config */}
          <div className="space-y-6">
            {/* Template selector */}
            <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base text-white/80">Select Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger className="w-full border-white/[0.08] bg-white/[0.03] text-white/80 focus:ring-[#ED6B23]/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/[0.1] bg-[#131a32] text-white/80">
                    {templates.map((t) => (
                      <SelectItem key={t.key} value={t.key} className="focus:bg-white/[0.06]">
                        <span className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              t.configured ? "bg-emerald-400" : "bg-red-400"
                            }`}
                          />
                          {t.description}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTemplate && (
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        selectedTemplate.configured ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />
                    <span className="text-white/40">
                      {selectedTemplate.configured
                        ? "Content SID configured"
                        : `Missing env var: ${selectedTemplate.key}`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Variable inputs */}
            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base text-white/80">Template Variables</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {selectedTemplate.variables.map((v, i) => (
                    <div key={v} className="space-y-1.5">
                      <Label className="text-xs font-medium text-white/40 uppercase tracking-wider">
                        {`{{${i + 1}}}`} &mdash; {v.replace(/_/g, " ")}
                      </Label>
                      <Input
                        value={variables[v] || ""}
                        onChange={(e) => setVariables((prev) => ({ ...prev, [v]: e.target.value }))}
                        placeholder={`Enter ${v.replace(/_/g, " ")}...`}
                        className="border-white/[0.08] bg-white/[0.03] text-white/80 placeholder:text-white/20 focus-visible:ring-[#ED6B23]/30"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Send actions */}
            {selectedTemplate && (
              <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base text-white/80">Send</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-0">
                  {/* Test send */}
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-white/40 uppercase tracking-wider">
                      Test Send (to your phone)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        placeholder="+971552500009"
                        className="flex-1 border-white/[0.08] bg-white/[0.03] text-white/80 placeholder:text-white/20 focus-visible:ring-[#ED6B23]/30"
                      />
                      <Button
                        onClick={() => handleSend("test")}
                        disabled={!adminPhone || sending !== null || !selectedTemplate.configured}
                        className="bg-[#ED6B23]/15 text-[#ED6B23] border border-[#ED6B23]/20 hover:bg-[#ED6B23]/25 disabled:opacity-40"
                      >
                        {sending === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                        <span className="ml-2">Test</span>
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-white/[0.06]" />

                  {/* Send to user */}
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-white/40 uppercase tracking-wider">
                      Send to Specific User
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="+971xxxxxxxxx"
                        className="flex-1 border-white/[0.08] bg-white/[0.03] text-white/80 placeholder:text-white/20 focus-visible:ring-[#ED6B23]/30"
                      />
                      <Button
                        onClick={() => handleSend("user")}
                        disabled={!userPhone || sending !== null || !selectedTemplate.configured}
                        className="bg-[#ED6B23]/15 text-[#ED6B23] border border-[#ED6B23]/20 hover:bg-[#ED6B23]/25 disabled:opacity-40"
                      >
                        {sending === "user" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span className="ml-2">Send</span>
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-white/[0.06]" />

                  {/* Broadcast */}
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-white/40 uppercase tracking-wider">
                      Broadcast to All Active Users
                    </Label>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={sending !== null || !selectedTemplate.configured}
                          className="w-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40"
                        >
                          <Radio className="mr-2 h-4 w-4" />
                          Broadcast to {activeUserCount} Active Users
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-white/[0.1] bg-[#131a32]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Confirm Broadcast</AlertDialogTitle>
                          <AlertDialogDescription className="text-white/50">
                            This will send the template &quot;{selectedTemplate.description}&quot; to{" "}
                            <strong className="text-white/80">{activeUserCount}</strong> users who were
                            active in the last 24 hours. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-white/[0.1] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/80">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleSend("broadcast")}
                            className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                          >
                            {sending === "broadcast" ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Radio className="mr-2 h-4 w-4" />
                            )}
                            Send Broadcast
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

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
                      {result.success
                        ? `Sent successfully${result.sentCount !== undefined ? ` (${result.sentCount} recipients)` : ""}`
                        : result.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Live preview */}
          <div className="lg:sticky lg:top-24 h-fit">
            <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base text-white/80">Message Preview</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {selectedTemplate ? (
                  <div className="space-y-4">
                    {/* WhatsApp-style bubble */}
                    <div className="rounded-xl bg-[#005c4b]/40 p-4 text-sm text-white/85 leading-relaxed">
                      {preview || <span className="italic text-white/30">Fill in variables to preview...</span>}
                    </div>
                    <p className="text-[11px] text-white/25 font-mono">
                      Template: {selectedTemplate.name}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-white/30">Select a template to preview</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
