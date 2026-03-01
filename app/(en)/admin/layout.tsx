"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, MessageSquareText, MessageSquareHeart, PanelLeftClose, PanelLeft } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/templates", label: "Templates", icon: MessageSquareText },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquareHeart },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/feedback/stats", { method: "POST" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.new != null) setNewFeedbackCount(data.new);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0f1e] text-white/90 overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#ED6B23]/[0.04] blur-[120px]" />
        <div className="absolute -bottom-60 -right-60 h-[600px] w-[600px] rounded-full bg-[#ED6B23]/[0.03] blur-[150px]" />
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 flex h-screen w-[240px] flex-col
          border-r border-white/[0.06]
          bg-[#0d1225]/80 backdrop-blur-xl
          transition-transform duration-300 ease-out
          lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-2">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#ED6B23]/20 to-[#ED6B23]/5 ring-1 ring-[#ED6B23]/20">
            <Image src="/ghali-logo-no-bg.svg" alt="Ghali" width={24} height={24} />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-wide text-white">Ghali</span>
            <span className="ml-1.5 inline-block rounded bg-[#ED6B23]/15 px-1.5 py-px text-[10px] font-medium uppercase tracking-widest text-[#ED6B23]">
              Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group relative flex items-center gap-3 rounded-lg px-3 py-2.5
                  text-[13px] font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-[#ED6B23]/10 text-[#ED6B23]"
                      : "text-white/45 hover:bg-white/[0.04] hover:text-white/70"
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#ED6B23]" />
                )}
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
                {item.href === "/admin/feedback" && newFeedbackCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ED6B23] px-1.5 text-[10px] font-bold text-white">
                    {newFeedbackCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/[0.06] px-5 py-4">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 ring-1 ring-white/10",
              },
            }}
          />
        </div>
      </aside>

      {/* Mobile header bar */}
      <div className="sticky top-0 z-20 flex h-14 items-center border-b border-white/[0.06] bg-[#0a0f1e]/80 px-4 backdrop-blur-lg lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80"
        >
          {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
        </button>
        <div className="ml-3 flex items-center gap-2">
          <Image src="/ghali-logo-no-bg.svg" alt="Ghali" width={20} height={20} />
          <span className="text-sm font-semibold text-white/80">Admin</span>
        </div>
      </div>

      {/* Main content */}
      <main className="relative z-10 min-h-screen lg:ml-[240px]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
