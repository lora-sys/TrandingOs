import { CheckIcon } from "lucide-react";
import type React from "react";

export function Panel({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card/70 p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-cyan-300" />
        {title}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function SaveButton({ busy, saved, onClick }: { busy: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black disabled:opacity-50" disabled={busy} onClick={onClick} type="button">
      {saved ? <CheckIcon className="size-4" /> : null}
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function SavedLine() {
  return <div className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-300"><CheckIcon className="size-3" /> Saved</div>;
}

export function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-white/10 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-medium">{value}</div></div>;
}
