"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ListTree, ShieldAlert, TrendingUp, Sparkles, FlaskConical } from "lucide-react";
import { PulseLine } from "./PulseLine";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/transactions", label: "Transactions", icon: ListTree },
  { href: "/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/predictions", label: "Predictions", icon: TrendingUp },
  { href: "/recommendations", label: "AI Recommendations", icon: Sparkles },
  { href: "/simulator", label: "Simulator", icon: FlaskConical },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-surface md:flex">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-pulse/15">
          <div className="h-2 w-2 rounded-full bg-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-sm font-semibold leading-tight text-text-primary">RazorPay Pulse</span>
          <span className="text-[11px] leading-tight text-text-faint">Payment Risk Intelligence</span>
        </div>
      </div>

      <div className="border-b border-line px-5 py-3">
        <PulseLine mode="brand" color="#6366F1" width={200} height={22} />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-pulse/10 text-pulse-bright"
                  : "text-text-muted hover:bg-surface-raised hover:text-text-primary"
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line px-5 py-4">
        <p className="text-[11px] leading-relaxed text-text-faint">
          Detect → Explain → Predict → Recommend
        </p>
      </div>
    </aside>
  );
}
