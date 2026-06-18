import { motion } from "framer-motion";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useMemo } from "react";
import type { TimelineEvent } from "@/api/types";
import { formatDateTime, shortId } from "@/lib/formatters";

export type TimelineEventCategory = "toolcall" | "useraction" | "system" | "milestone";

export function TimelineEventCard({
  event,
  expanded,
  onToggle,
}: {
  event: TimelineEvent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const category = classifyEvent(event);
  const visual = visualForCategory(category);
  const payload = useMemo(() => normalizePayload(event), [event]);

  return (
    <motion.article
      className={`rounded-lg border border-l-4 p-3 text-sm transition-colors ${visual.border} ${visual.bg} ${visual.shadow}`}
      whileHover={{ x: 3 }}
    >
      <button className="w-full text-left" onClick={onToggle} type="button">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-base" aria-hidden>{visual.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded border px-2 py-0.5 text-xs ${visual.badge}`}>{visual.label}</span>
              <span className="font-medium">{event.title || event.type}</span>
              <StatusBadge status={event.status} />
            </div>
            <p className="mt-2 line-clamp-2 text-muted-foreground">{event.detail || payload.preview || event.type}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{formatDateTime(event.created_at)}</span>
              {payload.duration && <span>{payload.duration}</span>}
              {payload.tokens && <span>{payload.tokens} tokens</span>}
              {event.workflow_run_id && <span>workflow {shortId(event.workflow_run_id)}</span>}
            </div>
          </div>
          <span className="mt-1 text-muted-foreground">{expanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}</span>
        </div>
      </button>
      {expanded && (
        <motion.pre
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 max-h-96 overflow-auto rounded-md border border-white/10 bg-black/25 p-3 text-xs text-muted-foreground"
          initial={{ opacity: 0, height: 0 }}
        >
          {payload.full}
        </motion.pre>
      )}
    </motion.article>
  );
}

export function classifyEvent(event: Pick<TimelineEvent, "type" | "title" | "status">): TimelineEventCategory {
  const text = `${event.type ?? ""} ${event.title ?? ""}`.toLowerCase();
  if (/milestone|settled|review|completed|artifact/.test(text) && event.status === "completed") return "milestone";
  if (/tool|skill|workflow|market|research|agent|paper|decision/.test(text)) return "toolcall";
  if (/user|approval|journal|manual|session/.test(text)) return "useraction";
  return "system";
}

function visualForCategory(category: TimelineEventCategory) {
  if (category === "toolcall") {
    return { icon: "⚡", label: "Tool Call", border: "border-l-cyan-500", bg: "bg-cyan-500/[0.03]", badge: "border-cyan-400/25 text-cyan-200", shadow: "" };
  }
  if (category === "useraction") {
    return { icon: "👤", label: "User Action", border: "border-l-emerald-500", bg: "bg-emerald-500/[0.03]", badge: "border-emerald-400/25 text-emerald-200", shadow: "" };
  }
  if (category === "milestone") {
    return { icon: "🏆", label: "Milestone", border: "border-l-amber-400", bg: "bg-amber-400/[0.05]", badge: "border-amber-400/25 text-amber-200", shadow: "shadow-lg shadow-amber-500/10" };
  }
  return { icon: "⚙️", label: "System", border: "border-l-gray-500", bg: "bg-gray-500/[0.02]", badge: "border-white/10 text-muted-foreground", shadow: "" };
}

function StatusBadge({ status }: { status?: string }) {
  const tone = status === "completed" ? "border-emerald-400/25 text-emerald-200" : status === "error" || status === "failed" ? "border-red-400/25 text-red-200" : status === "running" ? "border-amber-400/25 text-amber-200" : "border-white/10 text-muted-foreground";
  return <span className={`rounded border px-2 py-0.5 text-xs ${tone}`}>{status ?? "pending"}</span>;
}

function normalizePayload(event: TimelineEvent) {
  const raw = event.payload_json ?? event.payload ?? event.data ?? {};
  const parsed = typeof raw === "string" ? safeJson(raw) ?? raw : raw;
  const full = typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
  const anyPayload = parsed && typeof parsed === "object" ? parsed as any : {};
  return {
    preview: previewText(anyPayload.detail ?? anyPayload.message ?? anyPayload.workflowId ?? anyPayload.skillId ?? ""),
    duration: formatDuration(anyPayload.durationMs ?? anyPayload.duration_ms),
    tokens: anyPayload.tokens ?? anyPayload.tokenUsage ?? anyPayload.token_usage,
    full: full || "No payload captured.",
  };
}

function previewText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value).slice(0, 220);
  } catch {
    return String(value);
  }
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatDuration(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)}s`;
  return `${numeric}ms`;
}
