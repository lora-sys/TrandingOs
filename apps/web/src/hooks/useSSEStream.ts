import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatItem, ChatSubmitStatus, PromptCommand, SessionEntry } from "@/core/types";
import { syncToItems } from "@/core/chat-conversion";
import { tradingPiApi } from "@/api/client";
import { useSubagentsStore, type SubAgentStatusView } from "@/lib/subagentsStore";

export interface UseSSEStreamReturn {
  /** Current rendered chat items */
  items: ChatItem[];
  /** Replace items (for external mutations like toggleAllTools) */
  setItems: React.Dispatch<React.SetStateAction<ChatItem[]>>;
  /** Current streaming status */
  status: ChatSubmitStatus;
  /** Error message if status is "error" */
  error: string | null;
  /** Send a user prompt via SSE stream */
  send: (command: PromptCommand) => void;
  /** Abort the current SSE stream */
  abort: () => void;
  /** ID generator bound to this stream's counter */
  nextId: (prefix: string) => string;
  /** Whether currently viewing historical session (blocks sending) */
  viewingHistory: boolean;
  /** Set viewingHistory mode */
  setViewingHistory: (v: boolean) => void;
}

interface UseSSEStreamOptions {
  viewingHistory?: boolean;
}

/**
 * useSSEStream — Manages the full SSE streaming lifecycle for chat.
 *
 * Encapsulates:
 * - EventTarget creation and cleanup via tradingPiApi.sendMessageStream
 * - 6 SSE event types: message_update, tool_execution_start/end, artifact_update, done, error
 * - SessionEntry accumulation in entriesRef
 * - syncToItems transformation to ChatItem[]
 * - Query cache invalidation on stream completion
 * - Message queue for rapid successive sends during streaming
 *
 * Interface: callers see `items: ChatItem[]` and `send()` / `abort()`.
 * The SessionEntry internals are hidden behind this seam.
 */
export function useSSEStream(options: UseSSEStreamOptions = {}): UseSSEStreamReturn {
  const queryClient = useQueryClient();

  const [items, setItems] = useState<ChatItem[]>([]);
  const [status, setStatus] = useState<ChatSubmitStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const [queuedMessages, setQueuedMessages] = useState<PromptCommand[]>([]);
  const [viewingHistory, setViewingHistory] = useState(options.viewingHistory ?? false);

  const sseRef = useRef<EventTarget | null>(null);
  const itemCounterRef = useRef(0);
  const entriesRef = useRef<SessionEntry[]>([]);
  const drainingRef = useRef(false);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const streamingAssistantEntryIdRef = useRef<string | undefined>(undefined);

  const nextId = useCallback((prefix: string) => {
    itemCounterRef.current += 1;
    return `${prefix}-${Date.now()}-${itemCounterRef.current}`;
  }, []);

  const send = useCallback(
    (command: PromptCommand) => {
      if (viewingHistory) {
        setError("Viewing historical session. Return to live session.");
        return;
      }
      setStatus("submitted");
      setError(null);

      // Build user entry
      const userId = nextId("user");
      const userEntry: SessionEntry = {
        type: "message",
        id: userId,
        message: {
          role: "user",
          content: command.message,
          customType: undefined,
        },
      };

      const baseEntries = [...entriesRef.current];
      entriesRef.current = [...baseEntries, userEntry];
      streamingAssistantEntryIdRef.current = undefined;

      // Immediately render the user message so the sender sees their bubble right away
      setItems(syncToItems(entriesRef.current, nextId));

      try {
        const sse = tradingPiApi.sendMessageStream(command.message, sessionIdRef.current);
        sseRef.current = sse;

        sse.addEventListener("message_update", ((e: CustomEvent) => {
          const detail = e.detail as Record<string, unknown>;
          if (typeof detail.sessionId === "string") sessionIdRef.current = detail.sessionId;
          if (!detail?.message) return;
          const msg = detail.message as Record<string, unknown>;
          if (msg.role && msg.role !== "assistant") return;

          setStatus("streaming");
          const assistantEntryId = (msg.id as string) || streamingAssistantEntryIdRef.current || nextId("assistant");
          streamingAssistantEntryIdRef.current = assistantEntryId;

          const entry: SessionEntry = {
            type: "message",
            id: assistantEntryId,
            message: {
              id: assistantEntryId,
              role: "assistant",
              content: msg.content as string,
              usage: msg.usage,
              ...msg,
            } as unknown as SessionEntry["message"],
            customType: undefined,
          };

          const existingIdx = entriesRef.current.findIndex((candidate) => candidate.id === entry.id);
          if (existingIdx >= 0) {
            entriesRef.current[existingIdx] = entry;
          } else {
            entriesRef.current.push(entry);
          }

          const newItems = syncToItems(entriesRef.current, nextId).map((item) =>
            item.kind === "message" && (item as Record<string, unknown>).role === "assistant"
              ? { ...item, streaming: true }
              : item,
          ) as ChatItem[];
          setItems(newItems);
        }) as EventListener);

        sse.addEventListener("tool_execution_start", ((e: CustomEvent) => {
          const detail = e.detail as Record<string, unknown>;
          if (!detail?.toolCallId) return;

          const entry: SessionEntry = {
            type: "tool_call",
            id: detail.toolCallId as string,
            message: {
              role: "toolResult",
              toolCallId: detail.toolCallId as string,
              toolName: detail.toolName as string,
              content: detail.args as any,
              customType: "tool_call",
            },
          };
          const existingIdx = entriesRef.current.findIndex((candidate) => candidate.id === entry.id);
          if (existingIdx >= 0) entriesRef.current[existingIdx] = entry;
          else entriesRef.current.push(entry);

          const newItems = syncToItems(entriesRef.current, nextId).map((item) =>
            item.kind === "message" && (item as Record<string, unknown>).role === "assistant"
              ? { ...item, streaming: true }
              : item,
          ) as ChatItem[];
          setItems(newItems);
        }) as EventListener);

        sse.addEventListener("tool_execution_end", ((e: CustomEvent) => {
          const detail = e.detail as Record<string, unknown>;
          if (!detail?.toolCallId) return;

          const resultEntry: SessionEntry = {
            type: "tool_result",
            id: `${detail.toolCallId as string}-result`,
            message: {
              role: "toolResult",
              toolCallId: detail.toolCallId as string,
              content: (detail.result ?? (detail.isError ? { error: true } : {})) as any,
              isError: detail.isError as boolean | undefined,
              customType: "tool_result",
            },
          };
          const existingIdx = entriesRef.current.findIndex((candidate) => candidate.id === resultEntry.id);
          if (existingIdx >= 0) entriesRef.current[existingIdx] = resultEntry;
          else entriesRef.current.push(resultEntry);

          const newItems = syncToItems(entriesRef.current, nextId).map((item) =>
            item.kind === "message" && (item as Record<string, unknown>).role === "assistant"
              ? { ...item, streaming: true }
              : item,
          ) as ChatItem[];
          setItems(newItems);
        }) as EventListener);

        sse.addEventListener("artifact_update", ((e: CustomEvent) => {
          window.dispatchEvent(new CustomEvent("pi:artifact_update", { detail: e.detail }));
        }) as EventListener);

        // Subagent lifecycle events: subagents:created/started/step/completed/failed/cancelled
        const subagentEventTypes = ["subagents:created", "subagents:started", "subagents:step", "subagents:completed", "subagents:failed", "subagents:cancelled"];
        for (const eventType of subagentEventTypes) {
          sse.addEventListener(eventType, ((e: CustomEvent) => {
            const detail = (e.detail ?? {}) as Record<string, unknown>;
            const payload = (detail.payload ?? detail) as Record<string, unknown>;
            const id = typeof payload.id === "string" ? payload.id : "";
            if (!id) return;
            const view: SubAgentStatusView = {
              id,
              agentType: typeof payload.agentType === "string" ? payload.agentType : "",
              description: typeof payload.description === "string" ? payload.description : "",
              status: typeof payload.status === "string" ? payload.status : "running",
              workflowId: typeof payload.workflowId === "string" ? payload.workflowId : undefined,
              stepName: typeof payload.stepName === "string" ? payload.stepName : undefined,
              stepNumber: typeof payload.stepNumber === "number" ? payload.stepNumber : undefined,
              totalSteps: typeof payload.totalSteps === "number" ? payload.totalSteps : undefined,
              startedAt: typeof payload.startedAt === "number" ? payload.startedAt : undefined,
              completedAt: typeof payload.completedAt === "number" ? payload.completedAt : undefined,
              durationMs: typeof payload.durationMs === "number" ? payload.durationMs : undefined,
              isBackground: Boolean(payload.isBackground),
              result: payload.result,
              error: typeof payload.error === "string" ? payload.error : undefined,
              recentEvents: [{ type: eventType, payload, timestamp: Date.now() }],
            };
            useSubagentsStore.getState().upsert(view);
          }) as EventListener);
        }

        sse.addEventListener("done", ((e: CustomEvent) => {
          const detail = e.detail as Record<string, unknown> | undefined;
          if (typeof detail?.sessionId === "string") sessionIdRef.current = detail.sessionId;
          sseRef.current = null;
          streamingAssistantEntryIdRef.current = undefined;

          const messages = Array.isArray(detail?.messages) ? detail.messages : [];
          for (const message of messages) {
            if (!message || typeof message !== "object") continue;
            const msg = message as Record<string, unknown>;
            if (msg.role && msg.role !== "assistant") continue;
            const messageId = String(msg.id || nextId("assistant"));
            if (entriesRef.current.some((entry) => entry.id === messageId)) continue;
            const textContent = extractMessageText(msg.content);
            const duplicateIdx = textContent
              ? entriesRef.current.findIndex((entry) =>
                  entry.message?.role === "assistant" && extractMessageText(entry.message.content) === textContent,
                )
              : -1;
            if (duplicateIdx >= 0) {
              entriesRef.current[duplicateIdx] = {
                type: "message",
                id: entriesRef.current[duplicateIdx].id,
                message: {
                  id: entriesRef.current[duplicateIdx].id,
                  role: "assistant",
                  content: msg.content as string,
                  usage: msg.usage,
                  ...msg,
                } as unknown as SessionEntry["message"],
              };
              continue;
            }
            entriesRef.current.push({
              type: "message",
              id: messageId,
              message: {
                id: messageId,
                role: "assistant",
                content: msg.content as string,
                usage: msg.usage,
                ...msg,
              } as unknown as SessionEntry["message"],
            });
          }

          const workflowResult = detail?.workflowResult as Record<string, unknown> | undefined;
          if (workflowResult && !entriesRef.current.some((entry) => entry.type === "workflow_result" && (entry.data as any)?.runId === workflowResult.runId)) {
            const output = workflowResult.output as Record<string, unknown> | undefined;
            const workflowId =
              String(workflowResult.workflowId || "") ||
              (output?.plan && output?.artifacts ? "trade.plan" : output?.report ? "research.asset" : "workflow");
            entriesRef.current.push({
              type: "workflow_result",
              id: String(workflowResult.runId || nextId("workflow")),
              data: {
                workflowId,
                runId: workflowResult.runId,
                output: workflowResult.output,
              },
            });
          }

          const finalItems = syncToItems(entriesRef.current, nextId) as ChatItem[];
          setItems(finalItems);

          setStatus("ready");
          setError(null);

          queryClient.invalidateQueries({ queryKey: ["messages"] });
          queryClient.invalidateQueries({ queryKey: ["timeline"] });
          queryClient.invalidateQueries({ queryKey: ["artifacts"] });
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
        }) as EventListener);

        sse.addEventListener("error", ((e: CustomEvent<{ message?: string; error?: string }>) => {
          sseRef.current = null;
          setStatus("error");
          setError(e.detail?.message || e.detail?.error || "Connection failed");
        }) as EventListener);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Send failed");
      }
    },
    [nextId, viewingHistory, queryClient],
  );

  // Auto-drain message queue when stream is ready
  useEffect(() => {
    if (status !== "ready" || queuedMessages.length === 0 || viewingHistory || drainingRef.current) return;
    const [next, ...rest] = queuedMessages;
    drainingRef.current = true;
    setQueuedMessages(rest);
    send(next);
    // Reset flag after state updates flush
    requestAnimationFrame(() => { drainingRef.current = false; });
  }, [status, queuedMessages.length, send, viewingHistory]);

  const abort = useCallback(() => {
    if (sseRef.current && typeof (sseRef.current as unknown as { abort: () => void }).abort === "function") {
      (sseRef.current as unknown as { abort: () => void }).abort();
    }
    setStatus("ready");
  }, []);

  return { items, setItems, status, error, send, abort, nextId, viewingHistory, setViewingHistory };
}

function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block: any) => {
      if (block?.type === "text" && typeof block.text === "string") return block.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}
