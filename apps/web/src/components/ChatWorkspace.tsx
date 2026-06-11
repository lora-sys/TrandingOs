import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ClipboardCopy, FileText, Eye, Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tradingPiApi } from "../api/client.js";
import type { Artifact, ChatMessage, TimelineEvent, Approval } from "../api/types.js";
import { useSession } from "./session.js";

/* ─── ai-elements Conversation ─── */
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation.js";

/* ─── ai-elements Message ─── */
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
  MessageResponse,
} from "@/components/ai-elements/message.js";

/* ─── ai-elements Tool ─── */
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool.js";

/* ─── ai-elements Sources ─── */
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources.js";

/* ─── ai-elements Confirmation ─── */
import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationActions,
  ConfirmationAction,
} from "@/components/ai-elements/confirmation.js";

/* ─── ai-elements Artifact ─── */
import {
  Artifact as ArtifactRoot,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions as ArtifactActionsRow,
  ArtifactAction,
  ArtifactContent,
} from "@/components/ai-elements/artifact.js";

/* ─── ai-elements PromptInput ─── */
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input.js";

/* ════════════════════════════════════════════════════
   Types & Helpers
   ════════════════════════════════════════════════════ */

type RichTimeline = TimelineEvent & { payload: unknown };
type ToolFrame = { call: RichTimeline; result?: RichTimeline | null };
interface GroupedMsg {
  msg: ChatMessage;
  tools: ToolFrame[];
}

/** Pair consecutive tool events into (call, result) frames. */
function pairTools(events: RichTimeline[]): ToolFrame[] {
  const out: ToolFrame[] = [];
  let i = 0;
  while (i < events.length) {
    const cur = events[i]!;
    if (cur.status === "completed" || cur.type === "agent.tool.result") {
      out.push({ call: cur, result: cur });
      i++;
    } else if (
      i + 1 < events.length &&
      events[i + 1]!.status === "completed"
    ) {
      out.push({ call: cur, result: events[i + 1]! });
      i += 2;
    } else {
      out.push({ call: cur });
      i++;
    }
  }
  return out;
}

/** Group tool events under their parent assistant message. */
function groupTools(
  msgs: ChatMessage[],
  timeline: RichTimeline[],
): GroupedMsg[] {
  const toolEvts = timeline.filter(
    (e) =>
      e.type?.startsWith("agent.tool.") ||
      e.type?.startsWith("pi."),
  );
  const groups: GroupedMsg[] = [];
  let ti = 0;

  for (const msg of msgs) {
    const buf: RichTimeline[] = [];
    if (msg.role === "assistant" || msg.kind === "pi_message") {
      while (ti < toolEvts.length) {
        buf.push(toolEvts[ti]!);
        ti++;
        if (toolEvts[ti - 1]!.type === "agent.tool.result") break;
      }
    }
    groups.push({ msg, tools: pairTools(buf) });
  }
  return groups;
}

/** Extract source-like events from timeline (type =~ /source|url|web/) */
function extractSources(timeline: RichTimeline[]): { title: string; url: string }[] {
  return timeline
    .filter((e) => /source|web_fetch|url/i.test(e.type) && e.payload)
    .map((e) => {
      const p = typeof e.payload === "object" && e.payload ? (e.payload as Record<string, unknown>) : {};
      return { title: String(p.title ?? e.title ?? ""), url: String(p.url ?? "") };
    })
    .filter((s) => s.url.startsWith("http"));
}

/** Pick the most recent approval record that matches an "approval.request" event. */
function findApprovalRequest(
  timeline: RichTimeline[],
  approvals: Approval[],
): { approval: Approval; event: RichTimeline } | null {
  const ev = timeline.findLast((e) => e.type === "approval.request" || e.type?.startsWith("pi.approval."));
  if (!ev) return null;
  const app = approvals.find((a) => ev.id?.includes(a.id) || a.id?.includes(ev.id));
  return app ? { approval: app, event: ev } : null;
}

/* ════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════ */

export function ChatWorkspace() {
  const queryClient = useQueryClient();
  const { sessionId, setSessionId } = useSession();
  const [status, setStatus] = useState<"idle" | "submitted" | "streaming" | "error">("idle");
  const [streamingText, setStreamingText] = useState<string>("");
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* ─── Data ─── */
  const { data: msgsData } = (useQuery as any)({
    queryKey: ["messages", sessionId],
    queryFn: () => tradingPiApi.messages(sessionId ?? ""),
    enabled: Boolean(sessionId),
  });
  const { data: rawArtifacts } = (useQuery as any)({
    queryKey: ["artifacts"],
    queryFn: tradingPiApi.artifacts,
  });
  const { data: rawTimeline } = (useQuery as any)({
    queryKey: ["timeline"],
    queryFn: tradingPiApi.timeline,
  });
  const { data: rawApprovals } = (useQuery as any)({
    queryKey: ["approvals"],
    queryFn: tradingPiApi.approvals,
  });

  const allMessages: ChatMessage[] = msgsData?.messages ?? [];
  const allArtifacts: Artifact[] = rawArtifacts ?? [];
  const allTimeline: RichTimeline[] = rawTimeline ?? [];
  const allApprovals: Approval[] = rawApprovals ?? [];

  /* ─── streaming index tracking ─── */

  /* ─── grouped data ─── */
  const grouped = useMemo(() => groupTools(allMessages, allTimeline), [allMessages, allTimeline]);
  const sources = useMemo(() => extractSources(allTimeline), [allTimeline]);
  const approvalRequest = useMemo(() => findApprovalRequest(allTimeline, allApprovals), [allTimeline, allApprovals]);

  /* ─── SSE streaming logic ─── */
  const sseRef = useRef<EventTarget | null>(null);

  const handleSubmit = async (message: { text: string }) => {
    const trimmed = message.text.trim();
    if (!trimmed) return;

    // Cancel any previous SSE
    sseRef.current = null;
    setStatus("submitted");
    setStreamingText("");
    setErrorMessage(null);

    // Generate a temp ID for the streaming message
    const tempId = `stream-${Date.now()}`;
    setStreamingMsgId(tempId);

    // Start SSE connection
    const sse = tradingPiApi.sendMessageStream(trimmed, sessionId ?? undefined);
    sseRef.current = sse;

    sse.addEventListener("message_update", ((e: CustomEvent) => {
      const { text } = e.detail;
      if (text) {
        setStreamingText(text);
        setStatus("streaming");
      }
    }) as EventListener);

    sse.addEventListener("tool_execution_start", ((e: CustomEvent) => {
      const { toolName, args } = e.detail;
      // Timeline event will be picked up by polling
    }) as EventListener);

    sse.addEventListener("done", ((e: CustomEvent) => {
      const result = e.detail;
      setStreamingMsgId(null);
      setStreamingText("");
      setStatus("idle");
      if (result.sessionId) setSessionId(result.sessionId);
      // Refresh all data from DB (includes timeline, artifacts)
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["messages"] }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        queryClient.invalidateQueries({ queryKey: ["artifacts"] }),
      ]);
    }) as EventListener);

    sse.addEventListener("agent_end", (() => {
      setStreamingMsgId(null);
      setStreamingText("");
      setStatus("idle");
    }) as EventListener);

    sse.addEventListener("error", ((e: CustomEvent) => {
      setStatus("error");
      setStreamingMsgId(null);
      setStreamingText("");
      setErrorMessage(e.detail?.message || e.detail?.error || "Connection failed");
    }) as EventListener);
  };

  /* Cleanup SSE on unmount */
  useEffect(() => {
    return () => { sseRef.current = null; };
  }, []);

  const copyContent = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* noop */ }
  }, []);

  /* ════════════════════════════════════════════════════
     Render
     ════════════════════════════════════════════════════ */

  return (
    <section className="chatContainer">
      {/* ────────── HEADER ────────── */}
      <header className="chatHeader">
        <div>
          <h1>
            Trading Pi Agent
            <span className={`statusBadge ${status === "idle" ? "idle" : status === "streaming" || status === "submitted" ? "streaming" : "error"}`}>
              ● {status === "idle" ? "READY" : status === "streaming" ? "RUNNING" : status === "submitted" ? "SUBMITTED" : "ERROR"}
            </span>
          </h1>
          <p>One core agent, Workflow + Skills, local artifacts, approval-first execution.</p>
        </div>
        <div className="commandHints">
          {["/research ETH", "/plan ETH/USDT 100", "/review-day"].map((cmd) => (
            <span key={cmd} className="commandHint">{cmd}</span>
          ))}
        </div>
      </header>

      {/* ────────── CONVERSATION ────────── */}
      <div className="conversationArea">
      <Conversation>
        <ConversationContent>
          {grouped.map(({ msg, tools }) => {
            const isAssistant = msg.role === "assistant";
            // The streaming message is identified by its temp ID match or before SSE done
            const isStreaming =
              isAssistant &&
              streamingMsgId !== null &&
              status !== "idle" &&
              ((msg.id === streamingMsgId) ||
               (msg.id.startsWith("stream-")));

            if (!isAssistant) {
              /* ─ user message ─ */
              return (
                <Message key={msg.id} from="user">
                  <MessageContent>
                    <p
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        fontFamily: '"Inter", system-ui, sans-serif',
                        fontSize: "14px",
                        lineHeight: "1.6",
                        color: "#e5edf6",
                      }}
                    >
                      {msg.content}
                    </p>
                  </MessageContent>
                </Message>
              );
            }

            /* ─ assistant message ─ */
            return (
              <Message key={msg.id} from="assistant">
                <MessageContent>
                  {/* AI response — mono font + streaming */}
                  <div
                    style={{
                      fontFamily: '"JetBrains Mono", "Noto Sans SC", ui-monospace, monospace',
                      fontSize: "14px",
                      lineHeight: "1.7",
                      color: "#e5edf6",
                    }}
                  >
                    <MessageResponse isAnimating={isStreaming}>
                      {msg.content}
                    </MessageResponse>
                  </div>

                  {/* Tool calls inline */}
                  {tools.length > 0 && (
                    <div
                      style={{
                        marginTop: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {tools.map((pair, i) => (
                        <ToolItem key={pair.call.id ?? `t${i}`} pair={pair} />
                      ))}
                    </div>
                  )}

                  {/* Message actions (hover) */}
                  <MessageActions>
                    <MessageAction
                      tooltip="Copy response"
                      onClick={() => copyContent(msg.content)}
                    >
                      <ClipboardCopy size={14} />
                    </MessageAction>
                  </MessageActions>
                </MessageContent>
              </Message>
            );
          })}

          {/* ── Synthetic streaming message (not yet in DB) ── */}
          {streamingMsgId && streamingText && status !== "idle" && (
            <Message key={streamingMsgId} from="assistant">
              <MessageContent>
                <div
                  style={{
                    fontFamily: '"JetBrains Mono", "Noto Sans SC", ui-monospace, monospace',
                    fontSize: "14px",
                    lineHeight: "1.7",
                    color: "#e5edf6",
                  }}
                >
                  <MessageResponse isAnimating>
                    {streamingText}
                  </MessageResponse>
                </div>
              </MessageContent>
            </Message>
          )}

          {/* ── Approval Request ── */}
          {approvalRequest && (
            <Confirmation
              state={
                approvalRequest.approval.status === "approved"
                  ? "approval-responded"
                  : approvalRequest.approval.status === "rejected"
                    ? "output-denied"
                    : "approval-requested"
              }
            >
              <ConfirmationTitle>
                {approvalRequest.approval.action} —{" "}
                {approvalRequest.approval.reason}
              </ConfirmationTitle>

              <ConfirmationRequest>
                <ConfirmationActions>
                  <ConfirmationAction
                    variant="default"
                    onClick={() => {
                      /* TODO: implement approve API */
                    }}
                  >
                    Approve
                  </ConfirmationAction>
                  <ConfirmationAction
                    variant="outline"
                    onClick={() => {
                      /* TODO: implement reject API */
                    }}
                  >
                    Reject
                  </ConfirmationAction>
                </ConfirmationActions>
              </ConfirmationRequest>

              <ConfirmationAccepted>
                <p style={{ color: "#22c55e", fontSize: "13px" }}>
                  ✓ Approved
                </p>
              </ConfirmationAccepted>
            </Confirmation>
          )}

          {/* ── Sources (from timeline data) ── */}
          {sources.length > 0 && (
            <Sources>
              <SourcesTrigger count={sources.length} />
              <SourcesContent>
                {sources.map((src, i) => (
                  <Source
                    key={i}
                    href={src.url}
                    title={src.title || src.url}
                  />
                ))}
              </SourcesContent>
            </Sources>
          )}

          {/* ── Artifacts (proper Artifact component) ── */}
          {allArtifacts.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "8px",
              }}
            >
              <p
                style={{
                  color: "#8da1b6",
                  fontSize: "11px",
                  fontFamily: '"JetBrains Mono", monospace',
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Artifacts
              </p>
              {allArtifacts.slice(0, 4).map((art) => (
                <ArtifactCard key={art.id} artifact={art} />
              ))}
            </div>
          )}
        </ConversationContent>

        {grouped.length === 0 && (
          <ConversationEmptyState
            title="Start your trading session"
            description="Ask Trading Pi or run /research, /plan, /review-day..."
            icon={<Bot size={28} />}
          />
        )}

        <ConversationScrollButton />
      </Conversation>
      </div>

      {/* ────────── INPUT ────────── */}
      <div className="chatInput">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask Trading Pi or run /research, /plan, /review-day..." />
          </PromptInputBody>
          <PromptInputFooter>
            <div />
            <PromptInputSubmit
              status={
                status === "submitted"
                  ? "submitted"
                  : status === "error"
                    ? "error"
                    : undefined
              }
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════ */

/* ─── Tool Item ─── */
function ToolItem({ pair }: { pair: ToolFrame }) {
  const typeClean = pair.call.type
    .replace(/^agent\.tool\./, "")
    .replace(/^pi\./, "");
  const done = Boolean(pair.result);
  const state: "output-available" | "input-available" | "output-error" = done
    ? pair.result!.status === "failed"
      ? "output-error"
      : "output-available"
    : "input-available";

  return (
    <Tool defaultOpen={!done}>
      <ToolHeader title={pair.call.title} type={"tool-call" as const} state={state} />
      <ToolContent>
        {pair.call.payload && <ToolInput input={pair.call.payload as any} />}
        {done && (
          <ToolOutput
            output={pair.result!.payload as any}
            errorText={pair.result!.status === "failed" ? pair.result!.title : undefined}
          />
        )}
        {!done && pair.call.status === "running" && (
          <div className="toolRunning">
            Running {typeClean}…
          </div>
        )}
      </ToolContent>
    </Tool>
  );
}

/* ─── ArtifactCard using ai-elements Artifact ─── */
function ArtifactCard({ artifact }: { artifact: Artifact }) {
  return (
    <ArtifactRoot
      style={{
        border: "1px solid #305842",
        background: "rgba(15, 29, 24, 0.85)",
        borderRadius: "10px",
      }}
    >
      <ArtifactHeader>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FileText size={16} style={{ color: "#22c55e", opacity: 0.8 }} />
          <div>
            <ArtifactTitle>{artifact.title}</ArtifactTitle>
            <ArtifactDescription>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 7px",
                  borderRadius: "5px",
                  background: "rgba(34, 197, 94, 0.12)",
                  color: "#22c55e",
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {artifact.type}
              </span>
            </ArtifactDescription>
          </div>
        </div>
        <ArtifactActionsRow>
          <ArtifactAction tooltip="Preview">
            <Eye size={14} />
          </ArtifactAction>
          <ArtifactAction tooltip="Copy">
            <Download size={14} />
          </ArtifactAction>
        </ArtifactActionsRow>
      </ArtifactHeader>
      <ArtifactContent>
        <p
          style={{
            color: "#d7e2ed",
            fontSize: "13px",
            lineHeight: "1.55",
            overflowWrap: "anywhere",
          }}
        >
          {artifact.summary}
        </p>
      </ArtifactContent>
    </ArtifactRoot>
  );
}
