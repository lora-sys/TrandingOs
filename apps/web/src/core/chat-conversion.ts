import { MAX_IMAGE_DIM, VALID_IMAGE_MIME_TYPES } from "./constants";
import type { ChatItem, PiMessage, PromptImage, SessionEntry, Usage } from "./types";

export function syncToItems(
  entries: SessionEntry[],
  nextId: (prefix: string) => string,
): ChatItem[] {
  const items: ChatItem[] = [];
  const tools = new Map<string, ChatItem & { kind: "tool" }>();

  for (const entry of entries) {
    if (entry.type === "tool_call" && entry.message?.toolCallId) {
      const tool: ChatItem & { kind: "tool" } = {
        kind: "tool",
        id: entry.message.toolCallId,
        name: entry.message.toolName || "tool",
        input: entry.message.content,
        state: "input-available",
      };
      tools.set(tool.id, tool);
      items.push(tool);
      continue;
    }

    if (entry.type === "tool_result" && entry.message?.toolCallId) {
      const tool = tools.get(entry.message.toolCallId);
      if (tool) {
        if (entry.message.isError) {
          tool.state = "output-error";
          tool.errorText = formatToolOutput(entry.message.content);
        } else {
          tool.state = "output-available";
          tool.output = formatToolOutput(entry.message.content);
        }
      }
      continue;
    }

    if (entry.type !== "message" || !entry.message) continue;
    const message = entry.message;

    if (message.role === "user") {
      const text = extractText(message.content);
      const images = extractImages(message.content);
      if (text || images.length > 0) {
        items.push({
          kind: "message",
          id: message.id || nextId("user"),
          role: "user",
          text,
          images,
          entryId: entry.id,
        });
      }
    } else if (message.role === "assistant") {
      const text = extractText(message.content);
      const reasoning = extractThinking(message.content);
      const toolCalls = extractToolCalls(message.content);
      if (text || reasoning) {
        items.push({
          kind: "message",
          id: message.id || nextId("assistant"),
          role: "assistant",
          text,
          reasoning,
          copyable: toolCalls.length === 0,
          presentation: toolCalls.length > 0 ? "activity" : "normal",
          cost: message.usage?.cost?.total,
        });
      }

      for (const call of toolCalls) {
        const tool: ChatItem & { kind: "tool" } = {
          kind: "tool",
          id: call.id || nextId("tool"),
          name: call.name || "tool",
          input: call.arguments,
          state: "input-available",
        };
        tools.set(tool.id, tool);
        items.push(tool);
      }
    } else if (message.role === "toolResult" && message.toolCallId) {
      const tool = tools.get(message.toolCallId);
      if (tool) {
        if (message.isError) {
          tool.state = "output-error";
          tool.errorText = formatToolOutput(message.content);
        } else {
          tool.state = "output-available";
          tool.output = formatToolOutput(message.content);
        }
      }
    }
  }

  // Also scan for custom types (artifact/plan/business-card entries)
  for (const entry of entries) {
    if ((entry as any).customType === "artifact" && (entry as any).artifactId) {
      const ae = entry as any;
      if (!items.find((i) => i.kind === "artifact" && i.artifactId === ae.artifactId)) {
        items.push({
          kind: "artifact",
          id: `artifact-${ae.artifactId}`,
          artifactId: ae.artifactId,
          title: ae.title || "Artifact",
          summary: ae.summary || "",
          type: ae.type || "unknown",
          content: ae.content,
          createdAt: ae.timestamp || new Date().toISOString(),
        });
      }
    }
    if ((entry as any).customType === "plan" && (entry as any).planId) {
      const pe = entry as any;
      if (!items.find((i) => i.kind === "plan" && i.planId === pe.planId)) {
        items.push({
          kind: "plan",
          id: `plan-${pe.planId}`,
          planId: pe.planId,
          title: pe.title || "Plan",
          description: pe.description || "",
          status: pe.status || "draft",
          steps: pe.steps,
          content: pe.content,
          isStreaming: pe.streaming || false,
        });
      }
    }

    if (entry.type === "workflow_result") {
      const workflowItems = extractWorkflowItems(entry);
      for (const workflowItem of workflowItems) {
        if (workflowItem.kind === "plan" && !items.find((item) => item.kind === "plan" && item.planId === workflowItem.planId)) {
          items.push(workflowItem);
        }
        if (workflowItem.kind === "artifact" && !items.find((item) => item.kind === "artifact" && item.artifactId === workflowItem.artifactId)) {
          items.push(workflowItem);
        }
        if (workflowItem.kind === "research-report" && !items.find((item) => item.kind === "research-report" && item.id === workflowItem.id)) {
          items.push(workflowItem);
        }
      }
    }

    const structuredItems = extractStructuredItems(entry);
    for (const structured of structuredItems) {
      if (structured.kind === "decision" && !items.find((item) => item.kind === "decision" && item.id === structured.id)) {
        items.push(structured);
      }
      if (structured.kind === "alpha-signal" && !items.find((item) => item.kind === "alpha-signal" && item.id === structured.id)) {
        items.push(structured);
      }
      if (structured.kind === "research-report" && !items.find((item) => item.kind === "research-report" && item.id === structured.id)) {
        items.push(structured);
      }
    }
  }

  return items;
}

function extractWorkflowItems(entry: SessionEntry): ChatItem[] {
  const data = entry.data as any;
  const workflowId = String(data?.workflowId ?? "");
  const output = data?.output;
  if (!isRecord(output)) return [];

  const items: ChatItem[] = [];
  const timestamp = String(entry.timestamp ?? new Date().toISOString());

  if (workflowId === "trade.plan") {
    const symbol = String(output.symbol ?? output.market?.symbol ?? "Trade");
    const planText = String(output.plan?.text ?? "");
    const risk = output.tradeRisk ?? output.risk;
    items.push({
      kind: "plan",
      id: `plan-${data.runId ?? entry.id ?? symbol}`,
      planId: String(data.runId ?? entry.id ?? symbol),
      title: `Trade Plan ${symbol}`,
      description: "AI-assisted plan generated from market snapshot and risk sizing.",
      status: "completed",
      steps: [
        { id: "market", title: "Market snapshot collected", status: "done" },
        { id: "risk", title: "Risk sizing calculated", status: "done" },
        { id: "ai", title: "AI plan generated", status: "done" },
        { id: "artifact", title: "Plan and risk artifacts saved", status: "done" },
      ],
      content: planText || (risk ? JSON.stringify(risk, null, 2) : undefined),
    });
  }

  const artifactCandidates = flattenArtifacts(output.artifacts);
  if (isRecord(output.artifact)) artifactCandidates.push(output.artifact);
  for (const artifact of artifactCandidates) {
    const artifactId = String(artifact.id ?? "");
    if (!artifactId) continue;
    items.push({
      kind: "artifact",
      id: `artifact-${artifactId}`,
      artifactId,
      title: String(artifact.title ?? artifact.type ?? "Artifact"),
      summary: String(artifact.summary ?? ""),
      type: String(artifact.type ?? "artifact"),
      createdAt: timestamp,
    });
  }

  const report = pickBusinessPayload(output, ["report", "researchReport", "result"]);
  if (looksLikeResearchReport(report)) {
    items.push({ kind: "research-report", id: `research-${objectId(report, entry.id)}`, report });
  }

  return items;
}

function flattenArtifacts(value: unknown): Array<Record<string, any>> {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value)) return Object.values(value).filter(isRecord);
  return [];
}

function extractStructuredItems(entry: SessionEntry): ChatItem[] {
  const customType = String(entry.customType || entry.message?.customType || entry.type || "");
  const toolName = String(entry.message?.toolName || "");
  const candidates = [
    entry.data,
    entry.value,
    entry.payload,
    entry.details,
    entry.message?.details,
    parseContent(entry.message?.content),
  ].filter(Boolean);
  const items: ChatItem[] = [];

  for (const candidate of candidates) {
    const decision = pickBusinessPayload(candidate, ["decision", "analysis", "result"]);
    if ((customType.includes("decision") || /decision/i.test(toolName) || looksLikeDecision(decision)) && looksLikeDecision(decision)) {
      items.push({ kind: "decision", id: `decision-${objectId(decision, entry.id)}`, decision });
      continue;
    }

    const signal = pickBusinessPayload(candidate, ["signal", "alphaSignal", "alpha", "result"]);
    if ((customType.includes("alpha") || customType.includes("signal") || /alpha|radar/i.test(toolName) || looksLikeAlphaSignal(signal)) && looksLikeAlphaSignal(signal)) {
      items.push({ kind: "alpha-signal", id: `alpha-${objectId(signal, entry.id)}`, signal });
      continue;
    }

    const report = pickBusinessPayload(candidate, ["report", "researchReport", "result"]);
    if ((customType.includes("research") || customType.includes("report") || /research/i.test(toolName) || looksLikeResearchReport(report)) && looksLikeResearchReport(report)) {
      items.push({ kind: "research-report", id: `research-${objectId(report, entry.id)}`, report });
    }
  }

  return items;
}

function pickBusinessPayload(value: unknown, keys: string[]): unknown {
  if (!isRecord(value)) return value;
  for (const key of keys) {
    if (value[key]) return value[key];
  }
  return value;
}

function parseContent(content: PiMessage["content"]): unknown {
  const text = extractText(content);
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function looksLikeDecision(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Boolean(
    value.thesis ||
      value.ruleCompliance ||
      value.invalidationCriteria ||
      (value.direction && (value.confidence || value.riskLevel || value.positionSize !== undefined)),
  );
}

function looksLikeAlphaSignal(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Boolean(
    (value.title || value.question) &&
      (value.score !== undefined || value.risk !== undefined || value.riskScore !== undefined || value.category || value.source),
  );
}

function looksLikeResearchReport(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Boolean(value.keyFindings || value.findings || value.executionSummary || value.dataSourceSummary || (value.topic && value.conclusion));
}

function objectId(value: unknown, fallback?: string) {
  if (isRecord(value)) return String(value.id || value.reportId || value.sessionId || value.title || value.topic || fallback || "item");
  return fallback || "item";
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

export function extractText(content: PiMessage["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter((block): block is { type: "text"; text?: string } => block.type === "text")
    .map((block) => block.text || "")
    .filter(Boolean)
    .join("\n");
}

export function extractThinking(content: PiMessage["content"]): string {
  if (!Array.isArray(content)) return "";

  return content
    .filter((block): block is { type: "thinking"; thinking?: string } => block.type === "thinking")
    .map((block) => block.thinking || "")
    .filter(Boolean)
    .join("\n");
}

export function extractImages(content: PiMessage["content"]): PromptImage[] {
  if (!Array.isArray(content)) return [];
  return content
    .filter(
      (
        block,
      ): block is {
        type: "image";
        data?: string;
        mimeType?: string;
        source?: { data?: string; media_type?: string };
      } => block.type === "image",
    )
    .map((block) => ({
      data: block.source?.data || block.data || "",
      mimeType: block.source?.media_type || block.mimeType || "image/png",
    }))
    .filter((image) => image.data);
}

export function extractToolCalls(content: PiMessage["content"]) {
  if (!Array.isArray(content)) return [];
  return content.filter(
    (
      block,
    ): block is {
      type: "toolCall";
      id?: string;
      name?: string;
      arguments?: unknown;
    } => block.type === "toolCall",
  );
}

export function findLastUsage(entries: Array<{ type: string; message?: PiMessage }>): Usage | null {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const usage = entries[i].message?.usage;
    if (usage) return usage;
  }
  return null;
}

export async function processPromptFiles(files: unknown[] | undefined): Promise<PromptImage[]> {
  if (!files?.length) return [];
  const images: PromptImage[] = [];
  for (const filePart of files) {
    const file = filePart instanceof File ? filePart : getFileFromPart(filePart);
    if (!file) {
      const converted = getImageFromFilePart(filePart);
      if (converted) images.push(converted);
      continue;
    }
    if (!file.type.startsWith("image/")) continue;
    try {
      images.push(await processImageFile(file));
    } catch (err) {
      console.error("[pi-web-ui] Image processing failed:", err);
    }
  }
  return images;
}

function getFileFromPart(part: unknown): File | null {
  if (typeof part !== "object" || part === null) return null;
  const maybeFile = (part as { file?: unknown }).file;
  return maybeFile instanceof File ? maybeFile : null;
}

function getImageFromFilePart(part: unknown): PromptImage | null {
  if (typeof part !== "object" || part === null) return null;
  const value = part as { mediaType?: string; mimeType?: string; url?: string };
  const mimeType = value.mediaType || value.mimeType || "";
  if (!mimeType.startsWith("image/") || !value.url?.startsWith("data:")) return null;
  const [, data = ""] = value.url.split(",");
  return data ? { data, mimeType } : null;
}

function processImageFile(file: File): Promise<PromptImage> {
  return new Promise((resolve, reject) => {
    const mimeType = VALID_IMAGE_MIME_TYPES.includes(file.type) ? file.type : "image/png";
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
          const scale = MAX_IMAGE_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to create canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outputMime = mimeType === "image/jpeg" ? "image/jpeg" : "image/png";
        const dataUrl = canvas.toDataURL(outputMime, outputMime === "image/jpeg" ? 0.85 : undefined);
        const base64 = dataUrl.split(",")[1];
        if (!base64) {
          reject(new Error("Failed to encode image"));
          return;
        }
        resolve({ data: base64, mimeType: outputMime });
      };
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function formatToolOutput(result: unknown): string {
  if (!result) return "";

  if (Array.isArray(result)) {
    return result.map((block) => (isTextBlock(block) ? block.text || "" : JSON.stringify(block, null, 2))).join("\n");
  }

  if (
    typeof result === "object" &&
    result !== null &&
    "content" in result &&
    Array.isArray((result as { content?: unknown }).content)
  ) {
    return formatToolOutput((result as { content: unknown[] }).content);
  }

  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

function isTextBlock(value: unknown): value is { type: "text"; text?: string } {
  return (
    typeof value === "object" && value !== null && "type" in value && (value as { type?: unknown }).type === "text"
  );
}
