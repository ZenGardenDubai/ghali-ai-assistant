"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, UserPlus, Crown, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Period = "today" | "yesterday" | "7d" | "30d";

interface Stats {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  proUsers: number;
  basicUsers: number;
}

interface RecentUser {
  phone: string;
  name?: string;
  tier: "basic" | "pro";
  credits: number;
  lastMessageAt?: number;
  createdAt: number;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

function formatRelativeTime(ts?: number): string {
  if (!ts) return "Never";
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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("today");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<RecentUser[] | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const fetchStats = useCallback(async (p: Period) => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: p }),
      });
      if (res.ok) setStats(await res.json());
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/recent-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      });
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(period);
  }, [period, fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const STAT_CARDS = [
    { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "#ED6B23" },
    { label: "New Users", value: stats?.newUsers, icon: UserPlus, color: "#22c55e" },
    { label: "Pro Users", value: stats?.proUsers, icon: Crown, color: "#f59e0b" },
    { label: "Basic Users", value: stats?.basicUsers, icon: User, color: "#6b7280" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-white/40">Platform analytics and user overview</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/[0.06] w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`
              rounded-lg px-4 py-2 text-xs font-medium tracking-wide transition-all duration-200
              ${
                period === p.value
                  ? "bg-[#ED6B23]/15 text-[#ED6B23] shadow-sm shadow-[#ED6B23]/10"
                  : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
              }
            `}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <Card
            key={card.label}
            className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1]"
          >
            <CardContent className="flex items-center gap-4 pt-0">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${card.color}15` }}
              >
                <card.icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="text-xs font-medium text-white/35 uppercase tracking-wider">{card.label}</p>
                {loadingStats ? (
                  <Skeleton className="mt-1 h-7 w-16 bg-white/[0.06]" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-white">{card.value ?? 0}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Users */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white/80">Recent Users</h2>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          {loadingUsers ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-white/[0.04]" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/35 text-xs uppercase tracking-wider font-medium">Phone</TableHead>
                  <TableHead className="text-white/35 text-xs uppercase tracking-wider font-medium">Name</TableHead>
                  <TableHead className="text-white/35 text-xs uppercase tracking-wider font-medium">Tier</TableHead>
                  <TableHead className="text-white/35 text-xs uppercase tracking-wider font-medium text-right">Credits</TableHead>
                  <TableHead className="text-white/35 text-xs uppercase tracking-wider font-medium">Last Active</TableHead>
                  <TableHead className="text-white/35 text-xs uppercase tracking-wider font-medium">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.phone} className="border-white/[0.04] hover:bg-white/[0.03]">
                    <TableCell className="font-mono text-sm text-white/70">{user.phone}</TableCell>
                    <TableCell className="text-sm text-white/60">{user.name || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.tier === "pro"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs"
                            : "border-white/10 bg-white/[0.04] text-white/40 text-xs"
                        }
                      >
                        {user.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-white/60">{user.credits}</TableCell>
                    <TableCell className="text-sm text-white/40">{formatRelativeTime(user.lastMessageAt)}</TableCell>
                    <TableCell className="text-sm text-white/40">{formatDate(user.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {users?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-white/30">
                      No users yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
