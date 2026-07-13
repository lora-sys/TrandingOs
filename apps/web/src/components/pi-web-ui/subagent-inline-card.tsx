import { useEffect, useState } from "react";
import { BotIcon, SquareIcon } from "lucide-react";

import { useSubagentsStore, type SubAgentStatusView } from "@/lib/subagentsStore";

/**
 * SubagentInlineCard — Live, compact subagent status shown inside the chat stream.
 *
 * Renders one card per active subagent with:
 * - name + status badge
 * - current step / progress
 * - elapsed time
 * - cancel (stop) button
 *
 * Click the body to open the SubagentDetailSidebar.
 */
export function SubagentInlineCard({
  agent,
  onOpen,
  onCancel,
}: {
  agent: SubAgentStatusView;
  onOpen: (id: string) => void;
  onCancel?: (id: string) => void;
}) {
  const [elapsedMs, setElapsedMs] = useState(() => computeElapsed(agent));

  useEffect(() => {
    const id = setInterval(() => setElapsedMs(computeElapsed(agent)), 500);
    return () => clearInterval(id);
  }, [agent]);

  return (
    <button
      className="my-2 flex w-full max-w-3xl items-center gap-3 rounded-lg border bg-card/70 px-3 py-2 text-left backdrop-blur transition-colors hover:bg-accent/40"
      onClick={() => onOpen(agent.id)}
      type="button"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <BotIcon className="size-4 text-sky-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">{agent.description || agent.agentType || agent.id}</span>
          <StatusBadge status={agent.status} />
        </div>
        <div className="truncate text-muted-foreground text-xs">
          {agent.stepName ? `${agent.stepName}${agent.stepNumber && agent.totalSteps ? ` (${agent.stepNumber}/${agent.totalSteps})` : ""}` : agent.agentType || "Working..."}
          {elapsedMs ? ` · ${formatElapsed(elapsedMs)}` : ""}
        </div>
      </div>
      {onCancel && (
        <span
          aria-label="Cancel sub-agent"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={(event) => {
            event.stopPropagation();
            onCancel(agent.id);
          }}
          role="button"
        >
          <SquareIcon className="size-4" />
        </span>
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = badgeTone(status);
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${tone}`}>
      {status}
    </span>
  );
}

function badgeTone(status: string): string {
  if (status === "completed") return "bg-emerald-500/15 text-emerald-400";
  if (status === "failed" || status === "error") return "bg-destructive/15 text-destructive";
  if (status === "cancelled" || status === "stopped" || status === "aborted") return "bg-amber-500/15 text-amber-400";
  if (status === "queued" || status === "background") return "bg-muted text-muted-foreground";
  return "bg-sky-500/15 text-sky-400";
}

function computeElapsed(agent: SubAgentStatusView): number {
  if (agent.completedAt && agent.startedAt) return agent.completedAt - agent.startedAt;
  if (agent.durationMs) return agent.durationMs;
  if (agent.startedAt) return Date.now() - agent.startedAt;
  return 0;
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

/**
 * SubagentInlineCards — Convenience wrapper that pulls active subagents
 * from the SSE-backed store and renders one SubagentInlineCard per agent.
 */
export function SubagentInlineCards({
  onOpen,
  onCancel,
}: {
  onOpen: (id: string) => void;
  onCancel?: (id: string) => void;
}) {
  const activeIds = useSubagentsStore((s) => s.activeIds);
  const byId = useSubagentsStore((s) => s.byId);
  if (activeIds.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {activeIds.map((id) => {
        const agent = byId[id];
        if (!agent) return null;
        return (
          <SubagentInlineCard
            agent={agent}
            key={id}
            onCancel={onCancel}
            onOpen={onOpen}
          />
        );
      })}
    </div>
  );
}