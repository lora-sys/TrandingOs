import type { ReactNode } from "react";

export function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      className={`rounded px-3 py-1.5 text-sm transition-colors ${active ? "bg-cyan-400 text-black" : "text-muted-foreground hover:text-foreground"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function Outcome({ label, value, tone }: { label: string; value: number; tone: "yes" | "no" }) {
  return (
    <div
      className={`rounded-md border p-3 ${tone === "yes" ? "border-emerald-400/20 bg-emerald-400/5" : "border-red-400/20 bg-red-400/5"}`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{Math.round(value * 100)}%</div>
    </div>
  );
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate">{value}</div>
    </div>
  );
}
