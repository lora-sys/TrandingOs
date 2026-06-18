import { CheckIcon, CopyIcon, ChevronRightIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { formatUsd, formatScore, formatPercent } from "@/lib/formatters";
import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanContent,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
} from "@/components/ai-elements/artifact";
import { AlphaRadarCard, DecisionCard, ResearchReportView, type DecisionCardData } from "@/components/mvp";
import { cn } from "@/lib/utils";

import { formatToolSummary, isToolExpandable } from "../../core/tool-summary";
import type { ChatItem } from "../../core/types";

export function ChatItemView({
  item,
  onCopy,
  onToggleTool,
  showThinking,
}: {
  item: ChatItem;
  onCopy: (text: string) => Promise<void> | void;
  onToggleTool: (id: string, open: boolean) => void;
  showThinking: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (item.kind === "system") {
    return (
      <div
        className={cn(
          "mx-auto max-w-xl whitespace-pre-wrap rounded-md border px-3 py-2 text-center text-sm",
          item.tone === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
          item.tone === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          (!item.tone || item.tone === "info") && "bg-muted text-muted-foreground",
        )}
      >
        {item.text}
      </div>
    );
  }

  if (item.kind === "tool") {
    const expandable = isToolExpandable(item);
    const open = expandable ? (item.open ?? false) : false;

    return (
      <div className="w-full max-w-[95%]">
        <Tool onOpenChange={(nextOpen) => expandable && onToggleTool(item.id, nextOpen)} open={open}>
          <ToolHeader
            collapsible={expandable}
            state={item.state}
            summary={formatToolSummary(item)}
            title={item.name}
            type={`tool-${item.name}` as `tool-${string}`}
          />
          {expandable && (
            <ToolContent>
              <ToolInput input={item.input as never} />
              <ToolOutput errorText={item.errorText} output={item.output as never} />
            </ToolContent>
          )}
        </Tool>
      </div>
    );
  }

  if (item.kind === "plan") {
    return (
      <div className="rounded-lg border border-white/[0.08] bg-card/70 backdrop-blur-sm my-2 overflow-hidden">
        <Plan isStreaming={item.isStreaming}>
          <PlanHeader>
            <PlanTrigger />
            <div>
              <PlanTitle>{item.title}</PlanTitle>
              <PlanDescription>{item.description}</PlanDescription>
            </div>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                item.status === "completed"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : item.status === "active"
                    ? "bg-cyan-500/15 text-cyan-400"
                    : item.status === "failed"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-white/[0.08] text-muted-foreground"
              }`}
            >
              {item.status}
            </span>
          </PlanHeader>
          <PlanContent>
            <div className="space-y-3">
              {item.steps && (
                <div className="space-y-2">
                  {item.steps.map((step, i) => (
                    <div key={step.id || i} className="flex items-start gap-2 text-xs">
                      <span
                        aria-label={`${step.title}: ${step.status}`}
                        className={`size-5 mt-0.5 flex shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
                          step.status === "done"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : step.status === "running"
                              ? "bg-cyan-500/15 text-cyan-400 animate-pulse"
                              : step.status === "error"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-white/[0.08] text-muted-foreground"
                        }`}
                      >
                        {step.status === "done"
                          ? "\u2713"
                          : step.status === "running"
                            ? "\u2026"
                            : step.status === "error"
                              ? "!"
                              : String(i + 1)}
                      </span>
                      <span className="text-muted-foreground">{step.title}</span>
                    </div>
                  ))}
                </div>
              )}
              {item.content && (
                <pre className="whitespace-pre-wrap border-t border-white/[0.08] pt-3 font-mono text-xs leading-relaxed">
                  {item.content}
                </pre>
              )}
            </div>
          </PlanContent>
        </Plan>
      </div>
    );
  }

  if (item.kind === "artifact") {
    return (
      <div
        className="group relative my-2 cursor-pointer rounded-lg border border-cyan-500/20 bg-cyan-500/[0.03] p-3 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/[0.06]"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("pi:artifact_update", {
              detail: { artifactId: item.artifactId },
            }),
          )
        }
      >
        <Artifact className="flex flex-col gap-2">
          <ArtifactHeader>
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-cyan-400" />
              <ArtifactTitle>{item.title}</ArtifactTitle>
            </div>
            <ArtifactDescription>{item.summary}</ArtifactDescription>
          </ArtifactHeader>
          <ArtifactActions>
            <ArtifactAction tooltip="View full" label="View" icon={ChevronRightIcon} />
            <span className="rounded border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {item.type || "artifact"}
            </span>
          </ArtifactActions>
        </Artifact>
        <div className="mt-1 text-[10px] text-muted-foreground">
          {new Date(item.createdAt).toLocaleTimeString()}
        </div>
      </div>
    );
  }

  if (item.kind === "decision") {
    return (
      <div className="my-2 w-full max-w-[95%]">
        <DecisionCard decision={item.decision as DecisionCardData} />
      </div>
    );
  }

  if (item.kind === "alpha-signal") {
    const signal = item.signal as Record<string, unknown>;
    return (
      <div className="my-2 w-full max-w-sm">
        <AlphaRadarCard
          category={stringValue(signal.category ?? signal.source, "signal")}
          change24h={formatPercent(signal.change24h ?? signal.change)}
          currentValue={stringValue(signal.currentValue ?? signal.value ?? signal.odds, "") || formatScore(signal.score)}
          reasoning={stringValue(signal.reasoning ?? signal.summary, "")}
          riskRating={numericValue(signal.risk ?? signal.riskScore, 3)}
          source={stringValue(signal.source, "alpha")}
          title={stringValue(signal.title ?? signal.question, "Untitled signal")}
          volume={formatUsd(signal.volume ?? signal.volumeUsd)}
        />
      </div>
    );
  }

  if (item.kind === "research-report") {
    return (
      <div className="my-2 w-full max-w-[95%]">
        <ResearchReportView report={item.report} />
      </div>
    );
  }

  // item.kind === "message" and role is "assistant" (user messages handled by UserMessageView)
  const canCopy = item.text.trim().length > 0 && item.copyable !== false && !item.streaming;
  const isActivity = item.presentation === "activity";

  const copyMessage = async () => {
    if (!canCopy) return;
    await onCopy(item.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Message className={cn(isActivity && "gap-1")} from={item.role}>
      <MessageContent
        className={cn(
          "w-full",
          isActivity && "gap-1 text-muted-foreground",
          item.streaming && 'after:ml-1 after:animate-pulse after:content-["▋"]',
        )}
      >
        {showThinking && item.reasoning && (
          <Reasoning className={cn(isActivity && "mb-1")} isStreaming={Boolean(item.streaming)}>
            <ReasoningTrigger className={cn(isActivity && "text-xs")} />
            <ReasoningContent className={cn(isActivity && "mt-1 text-xs")}>{item.reasoning}</ReasoningContent>
          </Reasoning>
        )}
        <MessageResponse
          className={cn(isActivity && "text-muted-foreground [&_ol]:my-1 [&_p]:my-0 [&_pre]:my-1 [&_ul]:my-1")}
        >
          {item.text}
        </MessageResponse>
      </MessageContent>
      {canCopy && (
        <MessageActions className="self-start opacity-0 transition-opacity group-hover:opacity-100">
          <MessageAction label="Copy message" onClick={copyMessage} tooltip="Copy">
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </MessageAction>
        </MessageActions>
      )}
    </Message>
  );
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numericValue(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
