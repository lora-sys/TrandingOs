/**
 * ResearchTab — Deep Research with SSE streaming, report viewing,
 * decision generation from reports, and workspace chat.
 *
 * Extracted from WorkspacePage.tsx to isolate the ~190-line streaming
 * logic and mutation-heavy component into its own module.
 */

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, MessageSquareIcon } from "lucide-react";
import { tradingPiApi } from "@/api/client";
import { ChatWorkspace } from "@/components/ChatWorkspace";
import {
  DecisionCard as MvpDecisionCard,
  DeepResearchProgressPanel,
  ResearchReportView,
  type DeepResearchStep,
} from "@/components/mvp";
import { parseMaybeJson } from "./workspace-utils";
import { ResearchSessionList } from "./components";

export function ResearchTab({
  workspace,
  workspaceId,
  researchSessions,
  initialTopic,
  autoStart,
  autoStartKey = 0,
}: {
  workspace: any;
  workspaceId: string;
  researchSessions: any[];
  initialTopic?: string;
  autoStart?: boolean;
  autoStartKey?: number;
}) {
  const queryClient = useQueryClient();
  const lastAutoStartKey = useRef<number | null>(null);
  const [topic, setTopic] = useState(initialTopic || workspace?.name || "");
  const [steps, setSteps] = useState<DeepResearchStep[]>([]);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [generatedDecision, setGeneratedDecision] = useState<any>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  const startResearch = (topicOverride?: string) => {
    const researchTopic = topicOverride || topic || workspace?.name || "Workspace research";
    setRunning(true);
    setSteps([]);
    setReport(null);
    setGeneratedDecision(null);
    setNotice("");
    const stream = tradingPiApi.startDeepResearchStream({ topic: researchTopic, workspaceId, maxIterations: 5 });
    stream.addEventListener("research:step", (event: any) =>
      setSteps((current) => [
        ...current.map((step) => (step.status === "running" ? { ...step, status: "completed" as const } : step)),
        {
          name: event.detail?.stepName ?? `Step ${current.length + 1}`,
          status: "running",
          detail: event.detail?.detail,
          toolName: event.detail?.toolName,
          inputPreview: event.detail?.inputPreview,
          outputPreview: event.detail?.outputPreview,
        },
      ]),
    );
    stream.addEventListener("research:complete", (event: any) => {
      setReport(event.detail?.report ?? event.detail);
      setRunning(false);
      setSteps((current) => current.map((step) => (step.status === "running" ? { ...step, status: "completed" } : step)));
      queryClient.invalidateQueries({ queryKey: ["research-sessions", workspaceId] });
    });
    stream.addEventListener("research:error", (event: any) => {
      setSteps((current) => [...current, { name: "Error", status: "error", detail: event.detail?.message }]);
      setRunning(false);
    });
  };

  useEffect(() => {
    if (!autoStart || running) return;
    if (lastAutoStartKey.current === autoStartKey) return;
    const researchTopic = initialTopic || topic || workspace?.name;
    if (!researchTopic) return;
    lastAutoStartKey.current = autoStartKey;
    setTopic(researchTopic);
    startResearch(researchTopic);
  }, [autoStart, autoStartKey, initialTopic, running, topic, workspace?.name]);

  const generateDecision = useMutation({
    mutationFn: (currentReport: any) =>
      tradingPiApi.analyzeDecision({
        topic: currentReport?.topic ?? topic ?? workspace?.name,
        workspaceId,
        report: currentReport,
      }),
    onSuccess: (result: any) => {
      setGeneratedDecision(result.decision ?? result);
      setNotice(result.aiDriven ? `AI decision generated with ${result.model ?? "configured model"}.` : "Decision generated without provider metadata.");
      queryClient.invalidateQueries({ queryKey: ["decisions", workspaceId] });
    },
    onError: (error: Error) => setNotice(`Decision generation failed: ${error.message}`),
  });

  const saveGeneratedDecision = useMutation({
    mutationFn: (decision: any) =>
      tradingPiApi.createDecision({
        workspaceId,
        topic: decision.topic ?? report?.topic ?? topic ?? workspace?.name,
        direction: decision.direction ?? "HOLD",
        positionSize: Number(decision.positionSize ?? 0),
        confidence: decision.confidence ?? "C",
        riskLevel: decision.riskLevel ?? "C",
        supportingReasons: decision.supportingReasons ?? [],
        againstReasons: decision.againstReasons ?? [],
        thesis: decision.thesis ?? "Generated from Deep Research report.",
        invalidationCriteria: decision.invalidationCriteria ?? "Re-check if the research thesis is invalidated.",
        status: "pending",
      }),
    onSuccess: () => {
      setNotice("Decision saved. Open the Decisions tab to confirm and execute a paper trade.");
      queryClient.invalidateQueries({ queryKey: ["decisions", workspaceId] });
    },
    onError: (error: Error) => setNotice(`Decision save failed: ${error.message}`),
  });

  const openResearchSession = useMutation({
    mutationFn: (sessionId: string) => tradingPiApi.researchSession(sessionId),
    onSuccess: (result: any) => {
      const payload =
        result.artifact?.previewPayload ??
        result.artifact?.preview_payload ??
        parseMaybeJson(result.artifact?.preview_payload_json) ??
        result.artifact?.payload ??
        parseMaybeJson(result.artifact?.payload_json) ??
        result.report;
      const loadedReport = payload?.report ?? payload;
      if (loadedReport) {
        setReport(loadedReport);
        setGeneratedDecision(null);
        setNotice("Loaded saved research report from workspace artifact.");
      } else {
        setNotice("Research report artifact did not include a preview payload.");
      }
    },
    onError: (error: Error) => setNotice(`Could not load report: ${error.message}`),
  });

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border bg-card/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <MessageSquareIcon className="size-4 text-cyan-300" />
            Deep Research
          </div>
          <div className="flex gap-2">
            <input className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50" onChange={(event) => setTopic(event.target.value)} placeholder="Research topic" value={topic} />
            <button className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black disabled:opacity-50" disabled={running} onClick={() => startResearch()} type="button">
              {running ? "Running" : "Deep Research"}
            </button>
          </div>
          <DeepResearchProgressPanel elapsedTime="live" isRunning={running} steps={steps} topic={topic || workspace?.name || "Workspace research"} />
        </section>
        <section className="rounded-lg border bg-card/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <FileTextIcon className="size-4 text-cyan-300" />
            Reports
          </div>
          {report ? (
            <div className="space-y-4">
              <ResearchReportView
                report={report}
                onAskFollowUp={() => setNotice("Report context is ready for follow-up in Workspace Chat below.")}
                onBackToChat={() => document.querySelector('[data-workspace-chat]')?.scrollIntoView({ behavior: "smooth", block: "start" })}
                onGenerateDecision={() => generateDecision.mutate(report)}
              />
              {notice && <div className="rounded-md border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">{notice}</div>}
              {generatedDecision && (
                <MvpDecisionCard
                  confirmBusy={saveGeneratedDecision.isPending}
                  decision={generatedDecision}
                  onConfirm={() => saveGeneratedDecision.mutate(generatedDecision)}
                />
              )}
            </div>
          ) : (
            <ResearchSessionList busySessionId={openResearchSession.variables} onOpenReport={(session) => openResearchSession.mutate(session.id)} sessions={researchSessions} />
          )}
        </section>
      </div>
      <section className="flex h-[720px] min-h-0 flex-col overflow-hidden rounded-lg border bg-card/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <MessageSquareIcon className="size-4 text-cyan-300" />
          Workspace Chat
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-white/10" data-workspace-chat>
          <ChatWorkspace />
        </div>
      </section>
    </div>
  );
}
