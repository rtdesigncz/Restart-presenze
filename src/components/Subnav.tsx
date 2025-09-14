"use client";

import { usePathname, useRouter } from "next/navigation";

type Tab = { label: string; href: string };

export default function Subnav() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs: Tab[] = [
    { label: "Oggi", href: "/" },
    { label: "Admin", href: "/admin" },
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-11 flex items-center gap-2">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <button
              key={t.href}
              onClick={() => router.push(t.href)}
              className={`text-sm px-3 py-1.5 rounded-md border transition ${
                active
                  ? "border-[var(--brand)] text-[var(--brand-ink)] bg-[#e6fbfc]"
                  : "border-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}