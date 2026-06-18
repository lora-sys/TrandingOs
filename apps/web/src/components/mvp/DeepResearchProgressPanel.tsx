import { motion } from "framer-motion";
import { CheckCircle2Icon, CircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";

export type DeepResearchStep = {
  name: string;
  status: "pending" | "running" | "completed" | "error";
  detail?: string;
  toolName?: string;
  inputPreview?: string;
  outputPreview?: string;
};

export function DeepResearchProgressPanel({
  isRunning,
  steps,
  topic,
  mode = "Built-in ReAct",
  elapsedTime = "0s",
  onCancel,
}: {
  isRunning: boolean;
  steps: DeepResearchStep[];
  topic: string;
  mode?: string;
  elapsedTime?: string;
  onCancel?: () => void;
}) {
  const total = Math.max(steps.length, 7);
  const completed = steps.filter((step) => step.status === "completed").length;
  const current = steps.findIndex((step) => step.status === "running") + 1 || Math.min(completed + 1, total);
  const pct = Math.round((completed / total) * 100);
  if (!isRunning && steps.length === 0) return null;
  return (
    <div className="mt-4 rounded-lg border bg-card/70 p-4 backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{topic}</div>
          <div className="mt-1 text-xs text-muted-foreground">Mode: {mode} · Elapsed: {elapsedTime}</div>
        </div>
        <span className="rounded border border-cyan-400/30 px-2 py-1 text-xs text-cyan-200">Step {current} of {total}</span>
      </div>
      <div className="space-y-2">
        {steps.map((step, index) => <StepRow index={index} key={`${step.name}-${index}`} step={step} />)}
        {Array.from({ length: Math.max(0, total - steps.length) }).map((_, index) => <StepRow index={steps.length + index} key={`pending-${index}`} step={{ name: defaultStepName(steps.length + index), status: "pending" }} />)}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{completed}/{total}</span>
        {onCancel && <button className="rounded border border-white/10 px-2 py-1 text-xs" onClick={onCancel} type="button">Cancel</button>}
      </div>
    </div>
  );
}

function StepRow({ step, index }: { step: DeepResearchStep; index: number }) {
  const Icon = step.status === "completed" ? CheckCircle2Icon : step.status === "running" ? Loader2Icon : step.status === "error" ? XCircleIcon : CircleIcon;
  return (
    <motion.div className="flex gap-3 rounded-md border border-white/10 p-3 text-sm" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${step.status === "completed" ? "text-emerald-300" : step.status === "running" ? "animate-spin text-cyan-300" : step.status === "error" ? "text-red-300" : "text-muted-foreground"}`} />
      <div className="min-w-0">
        <div className={step.status === "pending" ? "text-muted-foreground" : "font-medium"}>{index + 1}. {step.name}</div>
        {step.detail && <div className="mt-1 text-xs text-muted-foreground">{step.detail}</div>}
        {(step.toolName || step.outputPreview) && <div className="mt-1 text-[11px] text-muted-foreground">{step.toolName}{step.outputPreview ? ` · ${step.outputPreview}` : ""}</div>}
      </div>
    </motion.div>
  );
}

function defaultStepName(index: number) {
  return ["Decompose research question", "Search web sources", "Search academic sources", "Read community sentiment", "Read top sources", "Analyze cross-references", "Synthesize report"][index] ?? `Step ${index + 1}`;
}
