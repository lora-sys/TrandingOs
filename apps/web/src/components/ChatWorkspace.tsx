import {
  ArchiveIcon,
  BarChart3Icon,
  BrainIcon,
  DownloadIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  TerminalIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ChatItemView,
  CommandPalette,
  ContextPopover,
  ExtensionDialogView,
  ModelPicker,
  PromptAttachmentButton,
  PromptAttachmentPreview,
  SubagentDetailSidebar,
  UserMessageView,
  WorkspaceStatusFloat,
} from "@/components/pi-web-ui";
import {
  processPromptFiles,
  syncToItems,
} from "@/core/chat-conversion";
import { copyText, isEditableTarget } from "@/core/format";
import { type SubagentStateMap, subagentList } from "@/core/subagents";
import { isToolExpandable } from "@/core/tool-summary";
import type {
  ChatItem,
  ChatSubmitStatus,
  ExtensionDialog,
  ModelInfo,
  PromptCommand,
  SessionEntry,
  SystemTone,
} from "@/core/types";
import { tradingPiApi } from "@/api/client";
import { useSettingsStore } from "@/lib/settingsStore";

export function ChatWorkspace() {
  const queryClient = useQueryClient();

  const [items, setItems] = useState<ChatItem[]>([]);
  const [chatStatus, setChatStatus] = useState<ChatSubmitStatus>("ready");
  const [currentModel, setCurrentModel] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advancedFeatures] = useState(false);

  /* Settings from global store (no more local state) */
  const setThinkingLevel = useSettingsStore((s) => s.setThinkingLevel);
  const setSessionName = useSettingsStore((s) => s.setSessionName);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const showThinking = useSettingsStore((s) => s.showThinking);
  const setAutoCompaction = useSettingsStore((s) => s.setAutoCompaction);
  const setAuthEnabled = useSettingsStore((s) => s.setAuthEnabled);

  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true,
  );

  const [queuedMessages, setQueuedMessages] = useState<PromptCommand[]>([]);

  const [viewedSessionFile, _setViewedSessionFile] = useState<string | null>(null);

  const [availableModels, _setAvailableModels] = useState<ModelInfo[]>([]);
  const [modelOpen, setModelOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [dialog, setDialog] = useState<ExtensionDialog | null>(null);
  const [subagents, _setSubagents] = useState<SubagentStateMap>({});
  const [selectedSubagentId, setSelectedSubagentId] = useState<string | null>(null);

  const [lastUsage, _setLastUsage] = useState<Record<string, unknown> | null>(null);
  const [contextWindowSize, setContextWindowSize] = useState(0);
  const [contextOpen, setContextOpen] = useState(false);

  // SSE refs
  const sseRef = useRef<EventTarget | null>(null);
  const itemCounterRef = useRef(0);
  const unreadCountRef = useRef(0);
  const originalTitleRef = useRef(document.title);
  const entriesRef = useRef<SessionEntry[]>([]);

  const resolvedTheme = themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;
  const viewingHistory = viewedSessionFile !== null;

  const nextId = useCallback((prefix: string) => {
    itemCounterRef.current += 1;
    return `${prefix}-${Date.now()}-${itemCounterRef.current}`;
  }, []);

  const addSystemMessage = useCallback(
    (text: string, tone: SystemTone = "info") => {
      setItems((current) => [...current, { kind: "system", id: nextId("system"), text, tone }]);
    },
    [nextId],
  );

  /* ── RPC: uses our tradingPiApi instead of pi-web-ui's /api/rpc ── */
  const rpc = useCallback(async (cmd: Record<string, unknown>) => {
    // Map pi-web-ui RPC commands to our API
    const type = cmd.type as string;
    switch (type) {
      case "get_state": {
        const [status, config] = await Promise.all([
          tradingPiApi.status().catch(() => ({})),
          tradingPiApi.config().catch(() => ({})),
        ]);
        return {
          success: true,
          data: {
            model: status.model ?? currentModel?.id ?? null,
            sessionName: useSettingsStore.getState().sessionName,
            autoCompactionEnabled: config.autoCompaction ?? true,
            thinkingLevel: config.thinkingLevel ?? "medium",
          },
        };
      }
      case "abort":
        if (sseRef.current && typeof (sseRef.current as any).abort === "function") {
          (sseRef.current as any).abort();
        }
        return { success: true };
      case "compact":
        return { success: true, data: {} };
      case "set_session_name":
        setSessionName(cmd.name as string);
        return { success: true };
      case "set_auto_compaction":
        setAutoCompaction(Boolean(cmd.enabled));
        tradingPiApi.setConfig({ autoCompaction: Boolean(cmd.enabled) }).catch(() => {});
        return { success: true };
      case "set_thinking_level":
        setThinkingLevel((cmd.level as string) || "off");
        tradingPiApi.setConfig({ thinkingLevel: cmd.level as string }).catch(() => {});
        return { success: true };
      case "set_model":
        setCurrentModel({ id: cmd.modelId as string, provider: cmd.provider as string });
        return { success: true };
      case "navigate_tree":
        return { success: true };
      case "get_auth":
        return { success: true, data: { configured: false, enabled: false } };
      case "set_auth":
        setAuthEnabled(Boolean(cmd.enabled));
        return { success: true, data: { enabled: cmd.enabled } };
      case "get_available_models":
        return { success: true, data: { models: [{ id: "default", provider: "trading-pi" }] } };
      case "export_html":
        addSystemMessage("Export not yet available in Trading Pi", "error");
        return { success: true };
      case "get_session_stats":
        addSystemMessage(
          [
            "Session stats",
            `Messages: ${items.length}`,
            items.filter((i) => i.kind === "tool").length > 0
              ? `Tool calls: ${items.filter((i) => i.kind === "tool").length}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        );
        return { success: true, data: { totalMessages: items.length, toolCalls: items.filter((i) => i.kind === "tool").length } };
      case "prompt":
      case "cycle_thinking_level":
      default:
        return { success: true, data: {} };
    }
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const result = await rpc({ type: "get_state" });
      if (result.data?.model) setCurrentModel(result.data.model);
      if (result.data?.sessionName) setSessionName(result.data.sessionName);
      if (result.data?.thinkingLevel) setThinkingLevel(result.data.thinkingLevel);
      if (result.data?.autoCompactionEnabled !== undefined)
        setAutoCompaction(result.data.autoCompactionEnabled);
    } catch (err) {
      console.error("[trading-pi] get_state failed", err);
    }
  }, [rpc]);

  /* ── Effects (same structure as pi-web-ui) ── */

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemDark(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    localStorage.setItem("pi-theme-mode", themeMode);
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, themeMode]);

  useEffect(() => {
    localStorage.setItem("pi-show-thinking", String(showThinking));
  }, [showThinking]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    const onFocus = () => {
      unreadCountRef.current = 0;
      document.title = originalTitleRef.current;
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  /* ── sendPrompt: structured event processing with syncToItems ── */
  const sendPrompt = useCallback(
    async (command: PromptCommand) => {
      if (viewingHistory) {
        setError("Viewing historical session. Return to live session.");
        return;
      }
      setChatStatus("submitted");
      setError(null);

      // User message entry
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

      // Reset entries for this turn — keep previous history + add new user msg
      const baseEntries = [...entriesRef.current];
      entriesRef.current = [...baseEntries, userEntry];

      try {
        const sse = tradingPiApi.sendMessageStream(command.message, undefined, undefined);
        sseRef.current = sse;

        sse.addEventListener("message_update", ((e: CustomEvent<any>) => {
          const detail = e.detail;
          if (!detail?.message) return;

          setChatStatus("streaming");

          // Build entry from the full AgentEvent
          const entry: SessionEntry = {
            type: "message",
            id: detail.message?.id || nextId("assistant"),
            message: {
              role: "assistant",
              content: detail.message.content,
              usage: detail.message.usage,
              ...detail.message,
            },
            customType: undefined,
          };

          // Append or update last assistant entry
          const existingIdx = entriesRef.current.findIndex(
            (e) => e.type === "message" && e.message?.role === "assistant" && e.id === entry.id,
          );
          if (existingIdx >= 0) {
            entriesRef.current[existingIdx] = entry;
          } else {
            entriesRef.current.push(entry);
          }

          // Rebuild all items from entries using syncToItems
          const newItems = syncToItems(entriesRef.current, nextId).map((item) =>
            item.kind === "message" && item.role === "assistant"
              ? { ...item, streaming: true }
              : item,
          );
          setItems(newItems);
        }) as EventListener);

        sse.addEventListener("tool_execution_start", ((e: CustomEvent<any>) => {
          const detail = e.detail;
          if (!detail?.toolCallId) return;

          const entry: SessionEntry = {
            type: "tool_call",
            id: detail.toolCallId,
            message: {
              role: "toolResult",
              toolCallId: detail.toolCallId,
              toolName: detail.toolName,
              content: detail.args,
              customType: "tool_call",
            },
          };
          entriesRef.current.push(entry);

          const newItems = syncToItems(entriesRef.current, nextId).map((item) =>
            item.kind === "message" && item.role === "assistant"
              ? { ...item, streaming: true }
              : item,
          );
          setItems(newItems);
        }) as EventListener);

        sse.addEventListener("tool_execution_end", ((e: CustomEvent<any>) => {
          const detail = e.detail;
          if (!detail?.toolCallId) return;

          // Find and update the tool_result entry
          const resultEntry: SessionEntry = {
            type: "tool_result",
            id: `${detail.toolCallId}-result`,
            message: {
              role: "toolResult",
              toolCallId: detail.toolCallId,
              content: detail.result ?? (detail.isError ? { error: true } : {}),
              isError: detail.isError,
              customType: "tool_result",
            },
          };
          entriesRef.current.push(resultEntry);

          const newItems = syncToItems(entriesRef.current, nextId).map((item) =>
            item.kind === "message" && item.role === "assistant"
              ? { ...item, streaming: true }
              : item,
          );
          setItems(newItems);
        }) as EventListener);

        sse.addEventListener("artifact_update", ((e: CustomEvent) => {
          window.dispatchEvent(new CustomEvent("pi:artifact_update", { detail: e.detail }));
        }) as EventListener);

        sse.addEventListener("done", (() => {
          sseRef.current = null;

          // Finalize: mark all assistant messages as not streaming
          const finalItems = syncToItems(entriesRef.current, nextId);
          setItems(finalItems);

          setChatStatus("ready");
          setError(null);

          queryClient.invalidateQueries({ queryKey: ["messages"] });
          queryClient.invalidateQueries({ queryKey: ["timeline"] });
          queryClient.invalidateQueries({ queryKey: ["artifacts"] });
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
        }) as EventListener);

        sse.addEventListener("error", ((e: CustomEvent<{ message?: string; error?: string }>) => {
          sseRef.current = null;
          setChatStatus("error");
          setError(e.detail?.message || e.detail?.error || "Connection failed");
        }) as EventListener);
      } catch (err) {
        setChatStatus("error");
        setError(err instanceof Error ? err.message : "Send failed");
      }
    },
    [nextId, viewingHistory, queryClient],
  );

  useEffect(() => {
    if (chatStatus !== "ready" || queuedMessages.length === 0 || viewingHistory) return;
    const [next, ...rest] = queuedMessages;
    setQueuedMessages(rest);
    sendPrompt(next);
  }, [chatStatus, queuedMessages, sendPrompt, viewingHistory]);

  const handleEditSubmit = useCallback(
    async (entryId: string, newText: string) => {
      await rpc({ type: "navigate_tree", entryId });
      await rpc({ type: "prompt", message: newText });
    },
    [rpc],
  );

  const submitMessage = useCallback(
    async ({ text, files }: { text: string; files?: unknown[] }) => {
      const trimmed = text.trim();
      const images = await processPromptFiles(files);
      if (!trimmed && images.length === 0) return;

      const command: PromptCommand = {
        id: nextId("prompt"),
        message: trimmed || "(see attached image)",
        images: images.length ? images : undefined,
      };

      if (chatStatus === "streaming" || chatStatus === "submitted") {
        setQueuedMessages((current) => [...current, command]);
        return;
      }

      await sendPrompt(command);
    },
    [chatStatus, nextId, sendPrompt],
  );

  const abort = useCallback(async () => {
    try {
      if (sseRef.current && typeof (sseRef.current as any).abort === "function") {
        (sseRef.current as any).abort();
      }
      await rpc({ type: "abort" });
      setChatStatus("ready");
      addSystemMessage("Aborted by user", "error");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Abort failed");
    }
  }, [addSystemMessage, rpc]);

  const selectModel = useCallback(
    async (model: ModelInfo) => {
      try {
        await rpc({
          type: "set_model",
          provider: model.provider,
          modelId: model.id,
        });
        setCurrentModel(model);
        if (model.contextWindow) setContextWindowSize(model.contextWindow);
        setModelOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to switch model");
      }
    },
    [rpc],
  );

  const compactContext = useCallback(async () => {
    try {
      await rpc({ type: "compact" });
      addSystemMessage("Compaction requested");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compaction failed");
    }
  }, [addSystemMessage, rpc]);

  const exportHtml = useCallback(async () => {
    try {
      const result = await rpc({ type: "export_html" });
      const data = result.data as any;
      if (data?.path) addSystemMessage(`Exported: ${data.path}`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }, [addSystemMessage, rpc]);

  const showSessionStats = useCallback(async () => {
    try {
      await rpc({ type: "get_session_stats" });
      addSystemMessage(
        [
          "Session stats",
          `Messages: ${items.length}`,
          items.filter((i) => i.kind === "tool").length > 0
            ? `Tool calls: ${items.filter((i) => i.kind === "tool").length}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stats failed");
    }
  }, [addSystemMessage, rpc, items]);

  const toggleAllTools = useCallback((open: boolean) => {
    setItems((current) =>
      current.map((item) => (item.kind === "tool" && isToolExpandable(item) ? { ...item, open } : item)),
    );
  }, []);

  const respondDialog = useCallback(
    (_response: Record<string, unknown>) => {
      if (!dialog) return;
      setDialog(null);
    },
    [dialog],
  );

  useEffect(() => {
    if (!dialog?.timeout) return;
    const timeout = window.setTimeout(() => respondDialog({ cancelled: true }), dialog.timeout);
    return () => window.clearTimeout(timeout);
  }, [dialog, respondDialog]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      } else if (event.key === "/") {
        event.preventDefault();
        document.querySelector<HTMLTextAreaElement>('textarea[name="message"]')?.focus();
      } else if (event.key === "Escape") {
        if (commandOpen) setCommandOpen(false);
        else if (modelOpen) setModelOpen(false);
        else if (useSettingsStore.getState().settingsOpen) useSettingsStore.getState().closeSettings();
        else if (chatStatus === "streaming") abort();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [abort, chatStatus, commandOpen, modelOpen]);

  const subagentItems = useMemo(() => subagentList(subagents), [subagents]);
  const selectedSubagent = selectedSubagentId ? subagents[selectedSubagentId] : null;

  const commandActions = [
    {
      label: "Compact",
      desc: "Compact context to save tokens",
      icon: ArchiveIcon,
      action: compactContext,
    },
    {
      label: "Export HTML",
      desc: "Export current session as HTML",
      icon: DownloadIcon,
      action: exportHtml,
    },
    {
      label: "Session Stats",
      desc: "Show message and tool call counts",
      icon: BarChart3Icon,
      action: showSessionStats,
    },
    {
      label: "Expand All Tools",
      desc: "Open every tool card",
      icon: PanelLeftOpenIcon,
      action: () => toggleAllTools(true),
    },
    {
      label: "Collapse All Tools",
      desc: "Close every tool card",
      icon: PanelLeftCloseIcon,
      action: () => toggleAllTools(false),
    },
  ];

  /* ════════════════════════════════════════════════════
     Render — exact same layout as pi-web-ui App()
     ════════════════════════════════════════════════════ */

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col">
        {/* Conversation area */}
        <div className="relative min-h-0 flex-1">
          <Conversation className="h-full">
            <ConversationContent className="mx-auto w-full max-w-3xl gap-3 px-4 py-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-6 py-12">
                  <ConversationEmptyState
                    description="向 Trading Pi 发送交易指令，开始智能交易对话"
                    icon={<TerminalIcon className="size-7" />}
                    title="Trading Pi"
                  />
                  <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                    {[
                      { label: "市场分析", prompt: "分析当前市场行情和趋势", icon: BarChart3Icon },
                      { label: "交易计划", prompt: "制定一个交易计划", icon: ArchiveIcon },
                      { label: "模拟交易", prompt: "运行一次模拟交易测试", icon: BrainIcon },
                      { label: "复盘总结", prompt: "总结最近的交易记录并复盘", icon: DownloadIcon },
                    ].map((action) => (
                      <button
                        key={action.label}
                        className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => submitMessage({ text: action.prompt })}
                        type="button"
                      >
                        <action.icon className="size-5 text-muted-foreground" />
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                items.map((item) =>
                  item.kind === "message" && item.role === "user" ? (
                    <UserMessageView
                      item={item as typeof item & { kind: "message"; role: "user" }}
                      key={item.id}
                      onCopy={(text) => copyText(text)}
                      onEdit={advancedFeatures && item.entryId ? handleEditSubmit : undefined}
                    />
                  ) : (
                    <ChatItemView
                      item={item}
                      key={item.id}
                      onCopy={(text) => copyText(text)}
                      onToggleTool={(id, open) =>
                        setItems((current) =>
                          current.map((candidate) =>
                            candidate.kind === "tool" && candidate.id === id ? { ...candidate, open } : candidate,
                          ),
                        )
                      }
                      showThinking={showThinking}
                    />
                  ),
                )
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {contextOpen && (
            <ContextPopover
              contextWindowSize={contextWindowSize}
              lastUsage={lastUsage}
              onClose={() => setContextOpen(false)}
            />
          )}
          {!selectedSubagent && !contextOpen && (
            <WorkspaceStatusFloat onOpenSubagent={setSelectedSubagentId} subagents={subagentItems} />
          )}
        </div>

        {queuedMessages.length > 0 && (
          <div className="mx-auto w-full max-w-3xl px-4 pt-2">
            <div className="flex flex-wrap gap-2">
              {queuedMessages.map((queued) => (
                <div className="flex items-center gap-2 rounded-md border bg-muted px-2 py-1 text-xs" key={queued.id}>
                  <span className="text-muted-foreground">Queued</span>
                  <span className="max-w-72 truncate">{queued.message}</span>
                  <button
                    onClick={() =>
                      setQueuedMessages((current) => current.filter((candidate) => candidate.id !== queued.id))
                    }
                    type="button"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mx-auto w-full max-w-3xl px-4 py-2">
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Prompt Input */}
        {!viewingHistory ? (
          <footer className="shrink-0 border-t bg-background/95 px-4 py-3">
            <div className="mx-auto w-full max-w-3xl">
              <PromptInput
                accept="image/*"
                className="rounded-xl border bg-card shadow-sm"
                globalDrop={true}
                multiple
                onSubmit={submitMessage}
              >
                <PromptAttachmentPreview />
                <PromptInputBody>
                  <PromptInputTextarea className="min-h-20 resize-none font-[family-name:var(--font-mono)]" placeholder="输入交易指令..." />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputTools>
                    <PromptAttachmentButton />
                    <div className="hidden items-center gap-1 px-2 text-muted-foreground text-xs sm:flex">
                      Enter sends, Shift+Enter inserts a newline
                    </div>
                  </PromptInputTools>
                  <PromptInputSubmit onStop={abort} status={chatStatus} />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </footer>
        ) : (
          <footer className="shrink-0 border-t bg-background/95 px-4 py-3">
            <div className="mx-auto w-full max-w-3xl text-center text-muted-foreground text-sm py-4">
              Viewing history
            </div>
          </footer>
        )}
      </div>

      {/* Floating overlays (portals) */}
      {selectedSubagent && (
        <SubagentDetailSidebar agent={selectedSubagent} onClose={() => setSelectedSubagentId(null)} />
      )}
      {modelOpen && (
        <ModelPicker
          currentModel={currentModel}
          models={availableModels}
          onClose={() => setModelOpen(false)}
          onSelect={selectModel}
          query={modelSearch}
          setQuery={setModelSearch}
        />
      )}
      {commandOpen && <CommandPalette commands={commandActions} onClose={() => setCommandOpen(false)} />}
      {dialog && (
        <ExtensionDialogView
          dialog={dialog}
          onCancel={() => respondDialog({ cancelled: true })}
          onRespond={respondDialog}
        />
      )}
    </TooltipProvider>
  );
}
