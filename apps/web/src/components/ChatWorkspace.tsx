import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCopy, MessageSquare, Share2, MoreHorizontal, Paperclip, Send, StopCircle, Search, FileText, TrendingUp, RefreshCw, Check, AlertCircle } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tradingPiApi } from "../api/client.js";
import type { ChatMessage, TimelineEvent } from "../api/types.js";
import { useSession } from "./session.js";

import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation.js";
import { Message, MessageContent, MessageActions, MessageAction, MessageResponse } from "@/components/ai-elements/message.js";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool.js";
import { ChainOfThought, ChainOfThoughtContent, ChainOfThoughtHeader, ChainOfThoughtStep } from "@/components/ai-elements/chain-of-thought.js";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning.js";

/* ════════════════════════════════════════════════════
   Types & Helpers
   ════════════════════════════════════════════════════ */

type RichTimeline = TimelineEvent & { payload: unknown; payload_json?: string };
type ToolFrame = { call: RichTimeline; result?: RichTimeline | null };
interface GroupedMsg {
  msg: ChatMessage;
  tools: ToolFrame[];
}

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

function groupTools(
  msgs: ChatMessage[],
  timeline: RichTimeline[],
): GroupedMsg[] {
  // Filter out internal lifecycle events that shouldn't be shown as tool calls
  const toolEvts = timeline.filter(
    (e) =>
      (e.type?.startsWith("agent.tool.") || e.type?.startsWith("pi.")) &&
      !["pi.turn_start", "pi.turn_end", "pi.message_start", "pi.message_end", "pi.message_update", "pi.error"].includes(e.type),
  );
  const groups: GroupedMsg[] = [];
  let ti = 0;

  // Filter messages to only show user and assistant roles, excluding system/event messages
  const visibleMsgs = msgs.filter(m => m.role === "user" || m.role === "assistant");

  for (const msg of visibleMsgs) {
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
  const [inputValue, setInputValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ─── Data ─── */
  const { data: msgsData } = useQuery<{ messages: ChatMessage[] }>({
    queryKey: ["messages", sessionId],
    queryFn: () => tradingPiApi.messages(sessionId ?? ""),
    enabled: Boolean(sessionId),
  });
  const { data: rawTimeline } = useQuery<TimelineEvent[]>({
    queryKey: ["timeline"],
    queryFn: tradingPiApi.timeline,
  });

  const allMessages: ChatMessage[] = msgsData?.messages ?? [];
  const allTimeline: RichTimeline[] = rawTimeline ?? [];

  /* ─── grouped data ─── */
  const grouped = useMemo(() => groupTools(allMessages, allTimeline), [allMessages, allTimeline]);

  /* ─── SSE streaming logic ─── */
  const sseRef = useRef<EventTarget | null>(null);

  const handleSubmit = useCallback(async (message: { text: string; files?: File[] }) => {
    const trimmed = message.text.trim();
    if (!trimmed && (!message.files || message.files.length === 0)) return;

    sseRef.current = null;
    setStatus("submitted");
    setStreamingText("");
    setErrorMessage(null);

    const tempId = `stream-${Date.now()}`;
    setStreamingMsgId(tempId);

    const sse = tradingPiApi.sendMessageStream(trimmed, sessionId ?? undefined, message.files);
    sseRef.current = sse;

    sse.addEventListener("message_update", ((e: CustomEvent) => {
      const { text } = e.detail;
      if (text) {
        setStreamingText(text);
        setStatus("streaming");
      }
    }) as EventListener);

    sse.addEventListener("artifact_update", ((e: CustomEvent) => {
      window.dispatchEvent(new CustomEvent("pi:artifact_update", { detail: e.detail }));
    }) as EventListener);

    sse.addEventListener("done", ((e: CustomEvent) => {
      const result = e.detail;
      setStreamingMsgId(null);
      setStreamingText("");
      setStatus("idle");
      setInputValue("");
      if (result.sessionId) setSessionId(result.sessionId);
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["messages"] }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        queryClient.invalidateQueries({ queryKey: ["artifacts"] }),
        queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      ]);
    }) as EventListener);

    sse.addEventListener("error", ((e: CustomEvent) => {
      setStatus("error");
      setStreamingMsgId(null);
      setStreamingText("");
      setErrorMessage(e.detail?.message || e.detail?.error || "Connection failed");
    }) as EventListener);
  }, [sessionId, queryClient, setSessionId]);

  useEffect(() => {
    return () => { sseRef.current = null; };
  }, []);

  /* ─── Global keyboard shortcut: Cmd+K → focus input ─── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const textarea = document.querySelector(".chatInputInner textarea") as HTMLTextAreaElement | null;
        if (textarea) textarea.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const copyContent = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* noop */ }
  }, []);

  const handleNewConversation = useCallback(() => {
    setSessionId(undefined!);
    setInputValue("");
    setStreamingText("");
    setStreamingMsgId(null);
    setStatus("idle");
  }, [setSessionId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() || attachedFiles.length > 0) {
        handleSubmit({ text: inputValue, files: attachedFiles });
        setInputValue("");
        setAttachedFiles([]);
      }
    }
  }, [inputValue, attachedFiles, handleSubmit]);

  const handleSendClick = useCallback(() => {
    if (inputValue.trim() || attachedFiles.length > 0) {
      handleSubmit({ text: inputValue, files: attachedFiles });
      setInputValue("");
      setAttachedFiles([]);
    }
  }, [inputValue, attachedFiles, handleSubmit]);

  const handleStop = useCallback(() => {
    if (sseRef.current && typeof (sseRef.current as any).abort === "function") {
      (sseRef.current as any).abort();
    }
    sseRef.current = null;
    setStreamingMsgId(null);
    setStreamingText("");
    setStatus("idle");
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    const maxHeight = 120;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  /* ════════════════════════════════════════════════════
     Render
     ════════════════════════════════════════════════════ */

  return (
    <section className="chatContainer">
      {/* ─── Header ─── */}
      <header className="chatHeader">
        <h1>
          {grouped.length > 0 ? "对话" : "新建对话"}
          <span className={`statusDot ${status === "idle" ? "idle" : status === "streaming" || status === "submitted" ? "streaming" : "error"}`} />
        </h1>
        <div className="chatHeader-actions">
          <button onClick={handleNewConversation} aria-label="新建对话" title="新建对话"><MessageSquare size={13} /></button>
          <button aria-label="分享对话" title="分享"><Share2 size={13} /></button>
          <button aria-label="更多选项" title="更多"><MoreHorizontal size={13} /></button>
          <kbd className="shortcutHint" title="Cmd+K 聚焦输入">⌘K</kbd>
        </div>
      </header>

      {/* ────────── CONVERSATION ────────── */}
      <div className="conversationArea" role="log" aria-label="对话消息列表" aria-live="polite">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {status === "streaming" && "正在生成回复..."}
          {status === "submitted" && "消息已发送，等待回复..."}
          {status === "error" && `错误: ${errorMessage}`}
        </div>

        <Conversation>
          <ConversationContent>
            {/* ─── Real messages from API ─── */}
            {grouped.map(({ msg, tools }) => {
              const isAssistant = msg.role === "assistant";
              const isStreaming =
                isAssistant &&
                streamingMsgId !== null &&
                status !== "idle" &&
                ((msg.id === streamingMsgId) ||
                 (msg.id.startsWith("stream-")));

              if (!isAssistant) {
                return (
                  <Message key={msg.id} from="user" className="messageSlideIn">
                    <MessageContent>
                      {typeof msg.content === "string" ? msg.content : ""}
                    </MessageContent>
                    <MessageActions>
                      <MessageAction tooltip={copiedId === `user-${msg.id}` ? "已复制" : "复制"} onClick={() => copyContent(typeof msg.content === "string" ? msg.content : "", `user-${msg.id}`)}>
                        {copiedId === `user-${msg.id}` ? <Check size={14} className="copyCheckIcon" /> : <ClipboardCopy size={14} />}
                      </MessageAction>
                    </MessageActions>
                  </Message>
                );
              }

              const responseText = typeof msg.content === "string" ? msg.content : "";
              const hasTools = tools.length > 0;

              return (
                <Message key={msg.id} from="assistant" className="messageSlideIn">
                  <MessageContent>
                    {hasTools && (
                      <ChainOfThought defaultOpen={isStreaming}>
                        <ChainOfThoughtHeader>查看思考过程与工具调用</ChainOfThoughtHeader>
                        <ChainOfThoughtContent>
                          {tools.map((pair, i) => {
                            const isFailed = pair.result?.status === "failed";
                            return (
                              <ChainOfThoughtStep
                                key={pair.call.id ?? `t${i}`}
                                label={pair.call.title}
                                status={pair.result ? "complete" : "active"}
                                icon={isFailed ? AlertCircle : undefined}
                                description={pair.call.detail}
                              />
                            );
                          })}
                        </ChainOfThoughtContent>
                      </ChainOfThought>
                    )}

                    <MessageResponse isAnimating={isStreaming && streamingMsgId === msg.id}>
                      {isStreaming && streamingMsgId === msg.id ? (
                        <>{streamingText}<span className="streamingCursor" /></>
                      ) : responseText}
                    </MessageResponse>

                    <MessageActions>
                      <MessageAction tooltip={copiedId === `asst-${msg.id}` ? "已复制" : "复制"} onClick={() => copyContent(responseText, `asst-${msg.id}`)}>
                        {copiedId === `asst-${msg.id}` ? <Check size={14} className="copyCheckIcon" /> : <ClipboardCopy size={14} />}
                      </MessageAction>
                      <MessageAction tooltip="分享">
                        <Share2 size={14} />
                      </MessageAction>
                    </MessageActions>
                  </MessageContent>
                </Message>
              );
            })}

            {/* ─── Streaming message ─── */}
            {streamingMsgId && streamingText && (
              <Message key={streamingMsgId} from="assistant" className="messageSlideIn">
                <MessageContent>
                  <MessageResponse isAnimating={true}>
                    <span className="streamingText">{streamingText}<span className="streamingCursor" /></span>
                  </MessageResponse>
                </MessageContent>
              </Message>
            )}

            {/* ─── Typing indicator ─── */}
            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent>
                  <TypingIndicator />
                </MessageContent>
              </Message>
            )}

            {/* ─── Error ─── */}
            {status === "error" && errorMessage && (
              <Message from="assistant">
                <MessageContent>
                  <div className="errorToast">
                    <span>{errorMessage}</span>
                  </div>
                </MessageContent>
              </Message>
            )}

            {/* ─── Empty state ─── */}
            {grouped.length === 0 && !streamingMsgId && (
              <ConversationEmptyState
                title="开始你的交易会话"
                description="向 Trading Pi 提问，或使用快捷操作开始"
                icon={<MessageSquare size={28} />}
              />
            )}

            {/* ─── Quick Actions ─── */}
            {grouped.length === 0 && !streamingMsgId && (
              <div className="quickActions">
                <div className="quickActions-label">快捷操作</div>
                <div className="quickActions-grid">
                  <button className="quickActionBtn" style={{ animationDelay: "0ms" }} title="向 Trading Pi 提问任何市场研究问题" onClick={() => handleSubmit({ text: "帮我分析 ETH 现在值不值得买" })}>
                    <Search size={16} />
                    <span className="quickAction-title">研究分析</span>
                    <span className="quickAction-desc">市场研究与分析</span>
                  </button>
                  <button className="quickActionBtn" style={{ animationDelay: "60ms" }} title="自动生成包含入场/止损/止盈的交易计划" onClick={() => handleSubmit({ text: "生成 ETH 交易计划" })}>
                    <FileText size={16} />
                    <span className="quickAction-title">制定计划</span>
                    <span className="quickAction-desc">生成交易计划</span>
                  </button>
                  <button className="quickActionBtn" style={{ animationDelay: "120ms" }} title="在模拟环境中执行交易策略" onClick={() => handleSubmit({ text: "执行模拟交易" })}>
                    <TrendingUp size={16} />
                    <span className="quickAction-title">模拟交易</span>
                    <span className="quickAction-desc">Paper Trading 执行</span>
                  </button>
                  <button className="quickActionBtn" style={{ animationDelay: "180ms" }} title="AI 自动复盘并给出改进建议" onClick={() => handleSubmit({ text: "帮我复盘今天的交易" })}>
                    <RefreshCw size={16} />
                    <span className="quickAction-title">自动复盘</span>
                    <span className="quickAction-desc">AI 分析与改进建议</span>
                  </button>
                </div>
              </div>
            )}
          </ConversationContent>

          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* ────────── INPUT ────────── */}
      <div className="chatInput">
        <div className="chatInputInner">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="fileInputHidden"
            onChange={handleFileSelect}
          />
          <button className="attachBtn" title="添加附件" aria-label="添加附件" onClick={handleAttachClick}>
            <Paperclip size={16} />
          </button>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              autoResize(e.target);
            }}
            placeholder="输入你的问题或任务... (⌘K 聚焦)"
            aria-label="输入你的问题或任务"
            rows={1}
            onKeyDown={handleKeyDown}
          />
          {attachedFiles.length > 0 && (
            <div className="attachedFiles">
              {attachedFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} className="attachedFile entering">
                  <span>{file.name}</span>
                  <button onClick={() => removeFile(i)} aria-label="移除附件">×</button>
                </div>
              ))}
            </div>
          )}
          {status === "streaming" || status === "submitted" ? (
            <button
              className="stopBtn"
              onClick={handleStop}
              aria-label="停止生成"
              title="停止"
            >
              <StopCircle size={18} />
            </button>
          ) : (
            <button
              className={`sendBtn ${(inputValue.trim() || attachedFiles.length > 0) ? "pulse" : ""}`}
              onClick={handleSendClick}
              disabled={(!inputValue.trim() && attachedFiles.length === 0) || status !== "idle"}
              aria-label="发送消息"
              title="发送"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════ */

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="typingIndicator">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
      <span className="typingText">Trading Pi 正在思考...</span>
    </div>
  );
});

const ToolItem = memo(function ToolItem({ pair }: { pair: ToolFrame }) {
  const typeClean = pair.call.type
    .replace(/^agent\.tool\./, "")
    .replace(/^pi\./, "");
  const done = Boolean(pair.result);
  const state: "output-available" | "input-available" | "output-error" = done
    ? pair.result!.status === "failed"
      ? "output-error"
      : "output-available"
    : "input-available";

  const payload = pair.call.payload as any;
  const resultPayload = pair.result?.payload as any;
  const toolName = payload?.toolName || payload?.name || typeClean;

  const getOutputSummary = () => {
    if (!done) return null;
    if (pair.result!.status === "failed") {
      return <div className="toolOutputSummary error">执行失败</div>;
    }
    if (!resultPayload) return null;
    
    if (toolName.includes("market") || toolName.includes("fetchTicker") || toolName.includes("ccxt")) {
      const data = resultPayload;
      if (data?.priceUsd || data?.last) {
        return (
          <div className="toolOutputSummary">
            <span className="toolSummaryLabel">价格</span>
            <span className="toolSummaryValue">${(data.priceUsd || data.last || 0).toFixed(2)}</span>
          </div>
        );
      }
      if (data?.symbol) {
        return (
          <div className="toolOutputSummary">
            <span className="toolSummaryLabel">{data.symbol}</span>
            <span className="toolSummaryValue">{data.exchange || 'market'}</span>
          </div>
        );
      }
    }
    
    if (toolName.includes("search") || toolName.includes("radar")) {
      const results = resultPayload?.results || resultPayload?.opportunities || [];
      return (
        <div className="toolOutputSummary">
          <span className="toolSummaryLabel">结果</span>
          <span className="toolSummaryValue">{Array.isArray(results) ? results.length : 0} 条</span>
        </div>
      );
    }
    
    if (toolName.includes("memory")) {
      return (
        <div className="toolOutputSummary">
          <span className="toolSummaryLabel">记忆</span>
          <span className="toolSummaryValue">已查询</span>
        </div>
      );
    }
    
    return (
      <details className="toolOutputDetails">
        <summary>查看详细结果</summary>
        <pre>{JSON.stringify(resultPayload, null, 2)}</pre>
      </details>
    );
  };

  return (
    <Tool defaultOpen={!done}>
      <ToolHeader title={pair.call.title || toolName} type={"tool-call" as const} state={state} />
      <ToolContent>
        {done && getOutputSummary()}
        {!done && pair.call.status === "running" && (
          <div className="toolRunning">
            执行中...
          </div>
        )}
      </ToolContent>
    </Tool>
  );
});
