import {
  ArchiveIcon,
  BarChart3Icon,
  BrainIcon,
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SparklesIcon,
  TerminalIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useResolvedTheme } from "@/lib/useResolvedTheme";
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
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { SlashCommandMenu } from "@/components/slash-command-menu";
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
  SubagentInlineCards,
  UserMessageView,
  WorkspaceStatusFloat,
} from "@/components/pi-web-ui";
import { ArtifactPanel } from "@/components/ArtifactPanel";
import { ExportMenu } from "@/components/ExportMenu";

// ── Extracted hooks ──
import { useSSEStream } from "@/hooks/useSSEStream";
import { useRpcRouter } from "@/hooks/useRpcRouter";
import { useModelPicker } from "@/hooks/useModelPicker";
import { useCommandBar } from "@/hooks/useCommandBar";

// ── Core utilities ──
import { processPromptFiles } from "@/core/chat-conversion";
import { copyText, isEditableTarget } from "@/core/format";
import { subagentList } from "@/core/subagents";
import { isToolExpandable } from "@/core/tool-summary";
import type {
  ChatItem,
  ChatSubmitStatus,
  ExtensionDialog,
  ModelInfo,
  SystemTone,
} from "@/core/types";

// ── API & Store ──
import { useSettingsStore } from "@/lib/settingsStore";
import { useSubagentsStore } from "@/lib/subagentsStore";
import { tradingPiApi } from "@/api/client";

/**
 * ChatWorkspace — Thin orchestrator for the trading terminal chat interface.
 *
 * All heavy logic is delegated to focused hooks:
 *   - useSSEStream:    streaming lifecycle, event handling, entries → items transform
 *   - useRpcRouter:   command registry (replaces monolithic switch/case)
 *   - useModelPicker: model selection state
 *   - useCommandBar:  keyboard shortcuts + command palette
 *   - settingsStore:  theme, thinking level, subagents (single source of truth)
 */
export function ChatWorkspace() {
  // ── Settings from global store ──
  const themeMode = useSettingsStore((s) => s.themeMode);
  const showThinking = useSettingsStore((s) => s.showThinking);
  const currentModelFromStore = useSettingsStore((s) => s.currentModel);
  const setSettingsModel = useSettingsStore((s) => s.setCurrentModel);
  const subagents = useSettingsStore((s) => s.subagents);
  const selectedSubagentId = useSettingsStore((s) => s.selectedSubagentId);
  const setSelectedSubagentId = useSettingsStore((s) => s.setSelectedSubagentId);

  // ── Theme resolution ──
  const resolvedTheme = useResolvedTheme(themeMode);

  // ── Hook: SSE streaming lifecycle ──
  const stream = useSSEStream();

  // ── Agent readiness probe — surfaces "AI not configured" before user types ──
  const { data: agentHealth } = useQuery({
    queryKey: ["agent-health"],
    queryFn: () => tradingPiApi.agentHealth().catch(() => null),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
  const agentReady = agentHealth?.ready !== false;

  // ── Hook: System message helper ──
  const addSystemMessage = useCallback(
    (text: string, tone: SystemTone = "info") => {
      const id = `system-${Date.now()}`;
      stream.setItems((current) => [
        ...current,
        { kind: "system", id, text, tone },
      ]);
    },
    [stream],
  );

  // ── Hook: RPC command router ──
  const rpc = useRpcRouter({
    items: stream.items,
    currentModel: currentModelFromStore,
    addSystemMessage,
    abortStream: () => { stream.abort(); addSystemMessage("Aborted by user", "error"); },
    setError: (msg) => {/* errors managed by stream hook */},
  });

  // ── Hook: Model picker ──
  const modelPicker = useModelPicker({
    onSetModel: async (model) => {
      await rpc.rpc({ type: "set_model", provider: model.provider, modelId: model.id });
    },
    onError: (msg) => addSystemMessage(msg, "error"),
  });

  // Sync model from store to picker on mount / refresh
  useEffect(() => {
    if (currentModelFromStore && !modelPicker.model) {
      // Model was set externally (e.g. by RPC); sync to local picker state
    }
  }, [currentModelFromStore]);

  // ── Hook: Command palette + keyboard shortcuts ──
  const [dialog, setDialog] = useState<ExtensionDialog | null>(null);
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [contextWindowSize, setContextWindowSize] = useState(0);
  const [lastUsage, _setLastUsage] = useState<Record<string, unknown> | null>(null);
  const [contextOpen, setContextOpen] = useState(false);

  // Build command actions with access to hook state
  const commandActions = [
    {
      label: "Compact",
      desc: "Compact context to save tokens",
      icon: ArchiveIcon,
      action: async () => {
        try { await rpc.rpc({ type: "compact" }); addSystemMessage("Compaction requested"); }
        catch (err) { addSystemMessage(err instanceof Error ? err.message : "Compaction failed", "error"); }
      },
    },
    {
      label: "Export HTML",
      desc: "Download conversation as styled HTML",
      icon: DownloadIcon,
      action: async () => {
        try { await rpc.rpc({ type: "export_html" }); }
        catch (err) { addSystemMessage(err instanceof Error ? err.message : "Export failed", "error"); }
      },
    },
    {
      label: "Export Markdown",
      desc: "Download conversation as Markdown",
      icon: FileTextIcon,
      action: async () => {
        try { await rpc.rpc({ type: "export_markdown" }); }
        catch (err) { addSystemMessage(err instanceof Error ? err.message : "Export failed", "error"); }
      },
    },
    {
      label: "Export PDF",
      desc: "Download conversation as PDF",
      icon: FileIcon,
      action: async () => {
        try { await rpc.rpc({ type: "export_pdf" }); }
        catch (err) { addSystemMessage(err instanceof Error ? err.message : "Export failed", "error"); }
      },
    },
    {
      label: "Session Stats",
      desc: "Show message and tool call counts",
      icon: BarChart3Icon,
      action: async () => {
        try { await rpc.rpc({ type: "get_session_stats" }); }
        catch (err) { addSystemMessage(err instanceof Error ? err.message : "Stats failed", "error"); }
      },
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

  const cmdBar = useCommandBar({
    initialActions: commandActions,
    isStreaming: stream.status === "streaming",
    onAbort: () => { stream.abort(); addSystemMessage("Aborted by user", "error"); },
  });

  // ── Local helpers ──
  const toggleAllTools = useCallback((open: boolean) => {
    stream.setItems((current) =>
      current.map((item) =>
        item.kind === "tool" && isToolExpandable(item) ? { ...item, open } : item,
      ),
    );
  }, [stream]);

  const lastUserPromptRef = useRef<string>("");
  const submitMessage = useCallback(
    async ({ text, files }: { text: string; files?: unknown[] }) => {
      const trimmed = text.trim();
      const images = await processPromptFiles(files);
      if (!trimmed && images.length === 0) return;

      if (trimmed) lastUserPromptRef.current = trimmed;

      const command = {
        id: stream.nextId("prompt"),
        message: trimmed || "(see attached image)",
        images: images.length ? images : undefined,
      };

      if (stream.status === "streaming" || stream.status === "submitted") return;
      stream.send(command);
    },
    [stream],
  );

  const regenerateLast = useCallback(() => {
    const last = lastUserPromptRef.current;
    if (!last) return;
    if (stream.status === "streaming" || stream.status === "submitted") return;
    stream.send({
      id: stream.nextId("prompt"),
      message: last,
    });
  }, [stream]);

  const handleEditSubmit = useCallback(
    async (_entryId: string, newText: string) => {
      await rpc.rpc({ type: "navigate_tree", entryId: _entryId });
      await rpc.rpc({ type: "prompt", message: newText });
    },
    [rpc],
  );

  const respondDialog = useCallback(() => {
    if (!dialog) return;
    setDialog(null);
  }, [dialog]);

  // ── Effects ──

  // Apply theme to document
  useEffect(() => {
    localStorage.setItem("pi-theme-mode", themeMode);
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, themeMode]);

  // Persist showThinking
  useEffect(() => {
    localStorage.setItem("pi-show-thinking", String(showThinking));
  }, [showThinking]);

  // Refresh state on mount
  useEffect(() => { rpc.refreshState(); }, [rpc.refreshState]);

  // Tab focus resets unread badge
  useEffect(() => {
    const originalTitle = document.title;
    let unreadCount = 0;
    const onFocus = () => { unreadCount = 0; document.title = originalTitle; };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Auto-open artifact panel on updates
  useEffect(() => {
    const handler = (e: any) => {
      setArtifactPanelOpen(true);
      if (e.detail?.artifactId) setSelectedArtifactId(e.detail.artifactId);
    };
    window.addEventListener("pi:artifact_update", handler);
    return () => window.removeEventListener("pi:artifact_update", handler);
  }, []);

  // Listen for "Research this" requests from AlphaRadarCard — dispatch a research prompt
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ symbol?: string }>).detail;
      const symbol = typeof detail?.symbol === "string" ? detail.symbol.trim() : "";
      if (!symbol) return;
      void submitMessage({ text: `/research ${symbol}` });
    };
    window.addEventListener("pi:research_request", handler);
    return () => window.removeEventListener("pi:research_request", handler);
  }, [submitMessage]);

  // Dialog timeout auto-respond
  useEffect(() => {
    if (!dialog?.timeout) return;
    const timeout = window.setTimeout(() => respondDialog(), dialog.timeout);
    return () => window.clearTimeout(timeout);
  }, [dialog, respondDialog]);

  // ── Derived state ──
  const subagentItems = useMemo(() => subagentList(subagents), [subagents]);
  const selectedSubagent = selectedSubagentId ? subagents[selectedSubagentId] : null;

  // Cancel running subagent (inline card button)
  const stopSubagent = useMutation({
    mutationFn: (id: string) => tradingPiApi.stopSubAgent(id, "Stopped from chat"),
  });
  const cancelSubagent = useCallback((id: string) => {
    stopSubagent.mutate(id);
  }, [stopSubagent]);

  /* ════════════════════════════════════════════════════
     Render — same layout as before, all logic in hooks above
     ════════════════════════════════════════════════════ */

  return (
    <TooltipProvider>
      <div className="relative flex h-full gap-0">
        {/* Main chat area */}
        <div className="flex min-w-0 flex-1 flex-col">
        {/* Conversation area */}
        <div className="relative min-h-0 flex-1">
          <Conversation className="h-full">
            <ConversationContent className="mx-auto w-full max-w-3xl gap-3 px-4 py-6">
              {stream.items.length === 0 ? (
                <div className="flex flex-col gap-3">
                  <SubagentInlineCards onCancel={cancelSubagent} onOpen={setSelectedSubagentId} />
                  <motion.div className="flex flex-col items-center gap-6 py-12" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <ConversationEmptyState
                    description="向 Trading Pi 发送交易指令，开始智能交易对话"
                    icon={<TerminalIcon className="size-7" />}
                    title="Trading Pi"
                  />
                  <div className="text-muted-foreground text-xs">Type / for commands</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md border bg-card/60 px-2 py-1">
                      Model: <span className="text-cyan-200">{String(modelPicker.model?.name ?? currentModelFromStore ?? "default")}</span>
                    </span>
                    <span className="rounded-md border bg-card/60 px-2 py-1">
                      Thinking: <span className="text-cyan-200">medium</span>
                    </span>
                    <button
                      className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-cyan-200 hover:bg-cyan-400/20"
                      onClick={() => modelPicker.setOpen(true)}
                      type="button"
                    >
                      Change model
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                    {[
                      { label: "市场分析", prompt: "分析当前市场行情和趋势", icon: BarChart3Icon },
                      { label: "交易计划", prompt: "制定一个交易计划", icon: ArchiveIcon },
                      { label: "模拟交易", prompt: "运行一次模拟交易测试", icon: BrainIcon },
                      { label: "复盘总结", prompt: "总结最近的交易记录并复盘", icon: DownloadIcon },
                    ].map((action) => (
                      <motion.button
                        key={action.label}
                        className="flex flex-col items-center gap-2 rounded-lg border bg-card/70 backdrop-blur-xl border-white/[0.08] p-4 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => submitMessage({ text: action.prompt })}
                        type="button"
                        whileHover={{ scale: 1.04, borderColor: "rgba(6,182,212,0.3)" }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <action.icon className="size-5 text-cyan-500/70" />
                        <span>{action.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <SubagentInlineCards onCancel={cancelSubagent} onOpen={setSelectedSubagentId} />
                  {stream.items.map((item) =>
                    <div key={item.id}>
                      {item.kind === "message" && item.role === "user" ? (
                        <UserMessageView
                          item={item as typeof item & { kind: "message"; role: "user" }}
                          onCopy={(text) => copyText(text)}
                          onEdit={false ? handleEditSubmit : undefined}
                        />
                      ) : (
                        <ChatItemView
                          item={item}
                          onCopy={(text) => copyText(text)}
                          onToggleTool={(id, open) =>
                            stream.setItems((current) =>
                              current.map((candidate) =>
                                candidate.kind === "tool" && candidate.id === id ? { ...candidate, open } : candidate,
                              ),
                            )
                          }
                          showThinking={showThinking}
                        />
                      )}
                    </div>
                  )}
                </div>
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

        {stream.status === "submitted" && (
          <div className="mx-auto w-full max-w-3xl px-4 pt-2">
            <div className="flex flex-wrap gap-2">
              <motion.div className="flex items-center gap-2 rounded-md border bg-muted px-2 py-1 text-xs" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                <span className="text-muted-foreground">Sending...</span>
              </motion.div>
            </div>
          </div>
        )}

        {stream.error && (
          <motion.div className="mx-auto w-full max-w-3xl px-4 py-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} layout>
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {stream.error}
            </div>
          </motion.div>
        )}

        {/* Prompt Input */}
        {!stream.viewingHistory ? (
          <footer className="shrink-0 border-t bg-background/80 backdrop-blur-md px-4 py-3">
            <div className="mx-auto w-full max-w-3xl">
              <div className="mb-2 flex items-center gap-2">
                <ExportMenu
                  items={stream.items.map((item) => ({
                    role: item.kind === "message" && item.role === "user" ? "user" as const
                      : item.kind === "tool" ? "tool" as const
                      : item.kind === "system" ? "system" as const
                      : "assistant" as const,
                    text: item.kind === "message" ? item.text : item.kind === "system" ? item.text : undefined,
                    thinking: item.kind === "message" ? (item as Record<string, unknown>).thinking as string | undefined : undefined,
                    toolName: item.kind === "tool" ? item.name : undefined,
                    toolArgs: item.kind === "tool" ? JSON.stringify(item.input) : undefined,
                    toolResult: item.kind === "tool" ? JSON.stringify(item.output) : undefined,
                  }))}
                  filenamePrefix="trading-pi-chat"
                />
                <button
                  onClick={() => setArtifactPanelOpen(!artifactPanelOpen)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                    artifactPanelOpen
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                      : "border-white/[0.08] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                  }`}
                  title="Artifacts"
                  type="button"
                >
                  <SparklesIcon className="size-3.5" />
                  Artifacts
                </button>
              </div>
              <PromptInputProvider>
                <PromptInputWithSlashMenu
                  className="rounded-xl border bg-card/70 backdrop-blur-xl border-white/[0.08] shadow-sm"
                  onStop={() => { stream.abort(); addSystemMessage("Aborted by user", "error"); }}
                  onSubmit={submitMessage}
                  status={stream.status}
                  agentReady={agentReady}
                  agentHealthMessage={agentHealth?.message}
                />
              </PromptInputProvider>
            </div>
          </footer>
        ) : (
          <footer className="shrink-0 border-t bg-background/80 backdrop-blur-md px-4 py-3">
            <div className="mx-auto w-full max-w-3xl text-center text-muted-foreground text-sm py-4">
              Viewing history
            </div>
          </footer>
        )}
      </div>

      {/* Artifact Sidebar */}
      {artifactPanelOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 360, opacity: 1 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="shrink-0 overflow-hidden border-l border-white/[0.08]"
        >
          <ArtifactPanel
            open={artifactPanelOpen}
            onClose={() => setArtifactPanelOpen(false)}
            selectedArtifactId={selectedArtifactId}
            onSelectArtifact={setSelectedArtifactId}
          />
        </motion.div>
      )}

      {/* Floating overlays (portals) */}
      {selectedSubagent && (
        <SubagentDetailSidebar agent={selectedSubagent} onClose={() => setSelectedSubagentId(null)} />
      )}
      {modelPicker.open && (
        <ModelPicker
          currentModel={modelPicker.model ?? currentModelFromStore}
          models={modelPicker.models}
          onClose={() => modelPicker.setOpen(false)}
          onSelect={(m) => modelPicker.select(m)}
          query={modelPicker.search}
          setQuery={modelPicker.setSearch}
        />
      )}
      {cmdBar.open && <CommandPalette commands={cmdBar.actions} onClose={() => cmdBar.closePalette()} />}
      {dialog && (
        <ExtensionDialogView
          dialog={dialog}
          onCancel={() => respondDialog()}
          onRespond={respondDialog}
        />
      )}
    </div>
    </TooltipProvider>
  );
}

/**
 * PromptInputWithSlashMenu — wraps the ai-elements PromptInput with the
 * autocomplete slash command menu. Lives inside a PromptInputProvider so it
 * can read and write the controlled text input value.
 */
function PromptInputWithSlashMenu({
  className,
  onSubmit,
  onStop,
  status,
  agentReady,
  agentHealthMessage,
}: {
  className?: string;
  onSubmit: (message: { text: string; files: unknown[] }) => void | Promise<void>;
  onStop: () => void;
  status: ChatSubmitStatus;
  agentReady: boolean;
  agentHealthMessage?: string;
}) {
  const controller = usePromptInputController();
  const inputValue = controller.textInput.value;
  const setInput = controller.textInput.setInput;

  return (
    <div className="relative">
      <SlashCommandMenu
        inputValue={inputValue}
        onSelect={(example) => {
          // Empty string = close (Esc). Otherwise replace input with example.
          setInput(example);
        }}
      />
      <PromptInput
        accept="image/*"
        className={className}
        globalDrop={true}
        multiple
        onSubmit={({ text, files }) => onSubmit({ text, files })}
      >
        {!agentReady && (
          <div className="mx-3 mt-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            <strong className="font-medium">AI not ready:</strong>{" "}
            {agentHealthMessage ?? "OPENAI_API_KEY is not configured. Set it in .env, then restart the server."}
          </div>
        )}
        <PromptAttachmentPreview />
        <PromptInputBody>
          <PromptInputTextarea
            className="min-h-20 resize-none font-[family-name:var(--font-mono)]"
            placeholder="输入交易指令... (输入 / 唤起命令菜单)"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptAttachmentButton />
            <div className="hidden items-center gap-1 px-2 text-muted-foreground text-xs sm:flex">
              Enter sends, Shift+Enter inserts a newline
            </div>
          </PromptInputTools>
          <PromptInputSubmit onStop={onStop} status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
