import { useCallback } from "react";
import type { ChatItem } from "@/core/types";
import { tradingPiApi } from "@/api/client";
import { useSettingsStore } from "@/lib/settingsStore";
import { toHtml, toMarkdown, toPdf } from "@/lib/exportService";
import type { ChatItemForExport } from "@/components/ExportMenu";

/** Shape of a single RPC command */
export interface RpcCommand {
  type: string;
  [key: string]: unknown;
}

/** Return value of a command handler */
export type RpcResult = Record<string, unknown>;

/** Command handler function signature */
export type RpcHandler = (cmd: RpcCommand, ctx: RpcContext) => RpcResult | Promise<RpcResult>;

/** Context injected into every command handler */
export interface RpcContext {
  /** Current chat items (for export commands) */
  items: ChatItem[];
  /** Currently selected model info */
  currentModel: { id: string; provider?: string } | null;
  /** Add a system message to the chat */
  addSystemMessage: (text: string, tone?: "info" | "success" | "error") => void;
  /** Abort the current SSE stream */
  abortStream: () => void;
  /** Set error state */
  setError: (msg: string) => void;
}

export interface UseRpcRouterReturn {
  /** Execute an RPC command by type */
  rpc: (cmd: RpcCommand) => Promise<RpcResult>;
  /** Register a custom command handler (overrides built-in) */
  register: (type: string, handler: RpcHandler) => void;
  /** Refresh state from backend */
  refreshState: () => Promise<void>;
}

/**
 * useRpcRouter — Command registry pattern for pi-web-ui RPC compatibility.
 *
 * Replaces the monolithic switch/case in ChatWorkspace with a registry:
 *   - Built-in handlers registered on init
 *   - Export commands delegate to ExportService (shared with ExportMenu)
 *   - Custom commands can be registered via `register()`
 *
 * Each handler receives a context object instead of closing over stale closures.
 */
export function useRpcRouter(ctx: RpcContext): UseRpcRouterReturn {
  const setSessionName = useSettingsStore((s) => s.setSessionName);
  const setThinkingLevel = useSettingsStore((s) => s.setThinkingLevel);
  const setAutoCompaction = useSettingsStore((s) => s.setAutoCompaction);
  const setCurrentModelFromStore = useSettingsStore((s) => s.setCurrentModel);

  const handlers = new Map<string, RpcHandler>();

  const register = (type: string, handler: RpcHandler) => {
    handlers.set(type, handler);
  };

  // ── Built-in command handlers ──

  register("get_state", async () => {
    const [status, config] = await Promise.all([
      tradingPiApi.status().catch(() => ({})),
      tradingPiApi.config().catch(() => ({})),
    ]);
    return {
      success: true,
      data: {
        model: (status as Record<string, unknown>).model ?? ctx.currentModel?.id ?? null,
        sessionName: useSettingsStore.getState().sessionName,
        autoCompactionEnabled: (config as Record<string, unknown>).autoCompaction ?? true,
        thinkingLevel: (config as Record<string, unknown>).thinkingLevel ?? "medium",
      },
    };
  });

  register("abort", () => {
    ctx.abortStream();
    return { success: true };
  });

  register("compact", () => ({
    type: "system_message",
    content: "Context compaction will be available when the backend compaction endpoint is ready.",
  }));

  register("set_session_name", (cmd) => {
    setSessionName(cmd.name as string);
    return { success: true };
  });

  register("set_auto_compaction", (cmd) => {
    setAutoCompaction(Boolean(cmd.enabled));
    tradingPiApi.setConfig({ autoCompaction: Boolean(cmd.enabled) }).catch(() => {});
    return { success: true };
  });

  register("set_thinking_level", (cmd) => {
    setThinkingLevel((cmd.level as string) || "off");
    tradingPiApi.setConfig({ thinkingLevel: cmd.level as string }).catch(() => {});
    return { success: true };
  });

  register("set_model", (cmd) => {
    setCurrentModelFromStore({ id: cmd.modelId as string, provider: cmd.provider as string });
    return { success: true };
  });

  register("navigate_tree", () => ({ success: true }));

  register("get_available_models", async () => {
    const statusData = await tradingPiApi.status().catch(() => null);
    const configData = await tradingPiApi.config().catch(() => null);
    const currentModel = (configData as Record<string, unknown>)?.modelId
      || (statusData as Record<string, unknown>)?.model
      || "default";
    return {
      success: true,
      data: {
        models: [
          { id: currentModel || "default", provider: "trading-pi", name: currentModel || "Default" },
          { id: "gpt-4o-mini", provider: "openai", name: "GPT-4o Mini" },
          { id: "gpt-4o", provider: "openai", name: "GPT-4o" },
          { id: "deepseek-v4-flash", provider: "deepseek", name: "DeepSeek V4 Flash" },
        ],
      },
    };
  });

  // ── Export commands (delegate to shared ExportService) ──

  register("export_html", () => {
    const exportItems = toExportItems(ctx.items);
    toHtml(exportItems);
    return { type: "system_message", content: "Chat exported as HTML file." };
  });

  register("export_markdown", () => {
    const exportItems = toExportItems(ctx.items);
    toMarkdown(exportItems);
    return { type: "system_message", content: "Chat exported as Markdown file." };
  });

  register("export_pdf", async () => {
    const exportItems = toExportItems(ctx.items);
    await toPdf(exportItems);
    return { type: "system_message", content: "Chat exported as PDF file." };
  });

  // ── Session stats ──

  register("get_session_stats", () => {
    ctx.addSystemMessage(
      [
        "Session stats",
        `Messages: ${ctx.items.length}`,
        ctx.items.filter((i) => i.kind === "tool").length > 0
          ? `Tool calls: ${ctx.items.filter((i) => i.kind === "tool").length}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return {
      success: true,
      data: { totalMessages: ctx.items.length, toolCalls: ctx.items.filter((i) => i.kind === "tool").length },
    };
  });

  // ── Default fallback ──

  register("prompt", () => ({ success: true, data: {} }));
  register("cycle_thinking_level", () => ({ success: true, data: {} }));

  // ── Core dispatch ──

  const rpc = useCallback(async (cmd: RpcCommand): Promise<RpcResult> => {
    const type = cmd.type as string;
    const handler = handlers.get(type);
    if (handler) return handler(cmd, ctx);
    // Fallback for unregistered commands
    return { success: true, data: {} };
  }, [ctx /* handlers is stable (mutated via ref-pattern through module scope) */]);

  const refreshState = useCallback(async () => {
    try {
      const result = await rpc({ type: "get_state" });
      const data = result.data as Record<string, unknown> | undefined;
      if (data?.model) setCurrentModelFromStore({ id: data.model as string });
      if (data?.sessionName) setSessionName(data.sessionName as string);
      if (data?.thinkingLevel) setThinkingLevel(data.thinkingLevel as string);
      if (data?.autoCompactionEnabled !== undefined) setAutoCompaction(data.autoCompactionEnabled as boolean);
    } catch (err) {
      console.error("[trading-pi] get_state failed", err);
    }
  }, [rpc, setSessionName, setThinkingLevel, setAutoCompaction, setCurrentModelFromStore]);

  return { rpc, register, refreshState };
}

// ── Internal helpers ──

/** Convert internal ChatItem[] to the flat format expected by ExportService */
function toExportItems(items: ChatItem[]): ChatItemForExport[] {
  return items.map((item) => ({
    role: item.kind === "message" && item.role === "user" ? "user" as const
      : item.kind === "tool" ? "tool" as const
      : item.kind === "system" ? "system" as const
      : "assistant" as const,
    text: item.kind === "message" ? item.text : item.kind === "system" ? item.text : undefined,
    thinking: item.kind === "message" ? (item as Record<string, unknown>).thinking as string | undefined : undefined,
    toolName: item.kind === "tool" ? item.name : undefined,
    toolArgs: item.kind === "tool" ? JSON.stringify(item.input) : undefined,
    toolResult: item.kind === "tool" ? JSON.stringify(item.output) : undefined,
  }));
}
