import { CheckCircle2Icon, ShieldAlertIcon, XCircleIcon } from "lucide-react";
import { shortId } from "@/lib/formatters";

export type DecisionCardData = {
  id?: string;
  confidence?: string;
  riskLevel?: string;
  direction?: string;
  positionSize?: number;
  status?: string;
  thesis?: string;
  supportingReasons?: string[];
  againstReasons?: string[];
  invalidationCriteria?: string;
  ruleCompliance?: { totalRules?: number; passed?: number; warnings?: string[]; blocked?: boolean; message?: string };
};

export function DecisionCard({
  decision,
  onConfirm,
  onEdit,
  confirmBusy,
}: {
  decision: DecisionCardData;
  onConfirm?: () => void;
  onEdit?: () => void;
  confirmBusy?: boolean;
}) {
  const confidence = decision.confidence ?? "C";
  const risk = decision.riskLevel ?? "C";
  const warnings = decision.ruleCompliance?.warnings ?? [];
  return (
    <article className="rounded-lg border border-white/10 bg-card/70 p-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <span className="rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-cyan-200">{decision.direction ?? "HOLD"}</span>
            <span className={gradeClass(confidence)}>Confidence {confidence}</span>
            <span className="rounded border border-white/10 px-2 py-1 text-muted-foreground">Risk {risk}</span>
          </div>
          <p className="mt-3 text-sm text-foreground">{decision.thesis ?? "No thesis recorded."}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {decision.id && <span className="rounded border border-white/10 px-2 py-1 text-xs text-muted-foreground">{shortId(decision.id)}</span>}
          {decision.status && <span className="rounded border border-white/10 px-2 py-1 text-xs text-muted-foreground">{decision.status}</span>}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ReasonList icon="support" items={decision.supportingReasons ?? []} title="Supporting reasons" />
        <ReasonList icon="against" items={decision.againstReasons ?? []} title="Against reasons" />
      </div>
      <div className="mt-4 rounded-md border border-white/10 p-3 text-sm">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Invalidation</div>
        <p className="mt-1 italic text-muted-foreground">{decision.invalidationCriteria ?? "No invalidation criteria recorded."}</p>
      </div>
      <div className={`mt-4 rounded-md border p-3 text-sm ${warnings.length ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"}`}>
        <ShieldAlertIcon className="mr-1 inline size-4" />
        {decision.ruleCompliance?.message ?? (warnings.length ? `${warnings.length} rule warning(s).` : "Rule compliance not evaluated.")}
        {warnings.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      </div>
      {(onConfirm || onEdit) && (
        <div className="mt-4 flex justify-end gap-2">
          {onEdit && <button className="rounded-md border border-white/10 px-3 py-2 text-sm" onClick={onEdit} type="button">Edit</button>}
          {onConfirm && (
            <button className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black disabled:opacity-50" disabled={confirmBusy} onClick={onConfirm} type="button">
              {confirmBusy ? "Executing" : "Confirm"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function ReasonList({ title, items, icon }: { title: string; items: string[]; icon: "support" | "against" }) {
  const Icon = icon === "support" ? CheckCircle2Icon : XCircleIcon;
  const color = icon === "support" ? "text-emerald-300" : "text-red-300";
  return (
    <div className="rounded-md border border-white/10 p-3">
      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-2">
        {(items.length ? items : ["No details recorded."]).map((item) => (
          <div className="flex gap-2 text-sm text-muted-foreground" key={item}>
            <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function gradeClass(grade: string) {
  if (/^A/.test(grade)) return "rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-emerald-200";
  if (/^B/.test(grade)) return "rounded border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-cyan-200";
  if (/^C/.test(grade)) return "rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-amber-200";
  return "rounded border border-red-400/30 bg-red-400/10 px-2 py-1 text-red-200";
}
