"use client";

import Topbar from "./Topbar";
import Subnav from "./Subnav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <Topbar />
      <Subnav />
      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6">{children}</div>
      </main>
    </div>
  );
}