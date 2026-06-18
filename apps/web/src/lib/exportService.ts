/**
 * ExportService — Pure export functions for chat conversations.
 * Shared by RPC command handlers and ExportMenu component.
 * No React dependency; testable in Node environment.
 */

import { jsPDF } from "jspdf";
import type { ChatItemForExport } from "@/components/ExportMenu";

/** Escape HTML special characters to prevent injection in exported documents */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Export conversation as a styled HTML document */
export function toHtml(items: ChatItemForExport[], filenamePrefix = "trading-pi-chat"): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const messagesHtml = items
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => {
      const role = item.role === "user" ? "User" : "Assistant";
      const parts: string[] = [];
      if (item.thinking)
        parts.push(
          `<div class="thinking"><strong>Thinking:</strong><pre>${escapeHtml(item.thinking)}</pre></div>`,
        );
      if (item.text)
        parts.push(`<div class="content"><pre>${escapeHtml(item.text)}</pre></div>`);
      return `<div class="message ${role.toLowerCase()}"><h4>${role}</h4>${parts.join("")}</div>`;
    })
    .join("\n");

  const toolsHtml = items
    .filter((i) => i.role === "tool")
    .map(
      (i) =>
        `<div class="tool"><h4>Tool: ${escapeHtml(i.toolName || "unknown")}</h4><pre class="args">${escapeHtml(i.toolArgs || "")}</pre></div>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Trading Pi — ${filenamePrefix} (${dateStr})</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'JetBrains Mono',monospace;max-width:820px;margin:0 auto;padding:24px;background:#0a0e17;color:#c9d1d9;line-height:1.6}
h1{color:#06b6d4;font-size:18px;margin-bottom:4px}
.meta{color:#6b7a8f;font-size:12px;margin-bottom:24px;border-bottom:1px solid #1e293b;padding-bottom:12px}
.message{margin:12px 0;padding:14px;border-radius:8px;border:1px solid #1e293b}
.user{background:#0d1117;border-left:3px solid #06b6d4}
.assistant{background:#0d1117;border-left:3px solid #8b5cf6}
.tool{margin:8px 0;padding:10px;background:#0f172a;border-radius:6px;border:1px #1e293b solid}
.thinking{margin-top:6px;color:#8b949e;font-size:13px}
.thinking pre{background:#161b22;padding:8px;border-radius:4px;margin-top:4px;white-space:pre-wrap;word-break:break-word}
.content pre{white-space:pre-wrap;word-break:break-word;font-size:14px}
.args{color:#7aa2f7;font-size:12px}
h4{font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.user h4{color:#06b6d4}.assistant h4{color:#a78bfa}.tool h4{color:#fbbf24}
</style>
</head>
<body>
<h1>Trading Pi — AI Trading Terminal</h1>
<div class="meta">Exported on ${new Date().toLocaleString()} · ${items.length} messages</div>
${messagesHtml}
${toolsHtml ? `<h3 style="color:#fbbf24;margin:20px 0 10px;font-size:14px">Tool Calls</h3>` + toolsHtml : ""}
</body></html>`;

  downloadBlob(html, `${filenamePrefix}-${dateStr}.html`, "text/html;charset=utf-8");
}

/** Export conversation as Markdown */
export function toMarkdown(items: ChatItemForExport[], filenamePrefix = "trading-pi-chat"): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# Trading Pi — ${filenamePrefix}`,
    "",
    `> Exported: ${new Date().toLocaleString()}`,
    "",
    "---",
    "",
  ];

  for (const item of items) {
    if (item.role === "user") {
      lines.push(`## 👤 User`, "", item.text || "(no content)", "");
    } else if (item.role === "assistant") {
      lines.push(`## 🤖 Assistant`, "");
      if (item.thinking) {
        lines.push(
          `<details>`,
          `<summary>Thinking Process</summary>`,
          "",
          "```",
          item.thinking,
          "```",
          "",
          `</details>`,
          "",
        );
      }
      if (item.text) {
        lines.push(item.text, "");
      }
    } else if (item.role === "tool") {
      lines.push(
        `### 🔧 Tool: \`${item.toolName}\``,
        "",
        "**Input:**",
        "```json",
        item.toolArgs || "{}",
        "```",
        "",
      );
    } else if (item.role === "tool_result") {
      lines.push(
        "**Result:**",
        "```",
        (item.toolResult || "").slice(0, 500) +
          ((item.toolResult || "").length > 500 ? "\n... (truncated)" : ""),
        "```",
        "",
      );
    }
    lines.push("---", "");
  }

  const markdown = lines.join("\n");
  downloadBlob(markdown, `${filenamePrefix}-${dateStr}.md`, "text/markdown;charset=utf-8");
}

/** Export conversation as PDF using jsPDF text layout */
export async function toPdf(items: ChatItemForExport[], filenamePrefix = "trading-pi-chat"): Promise<void> {
  const dateStr = new Date().toISOString().slice(0, 10);

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 40;
  const marginTop = 42;
  const lineHeight = 14;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = marginTop;

  const ensureSpace = (nextHeight: number) => {
    if (cursorY + nextHeight > pageHeight - 36) {
      pdf.addPage();
      cursorY = marginTop;
    }
  };

  const writeTitle = (text: string, size: number, color: string) => {
    ensureSpace(size + 10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(size);
    pdf.setTextColor(color);
    pdf.text(text, marginX, cursorY);
    cursorY += size + 8;
  };

  const writeLabel = (text: string) => {
    ensureSpace(18);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor("#111827");
    pdf.text(text, marginX, cursorY);
    cursorY += 14;
  };

  const writeParagraph = (text: string, color = "#1f2937") => {
    const wrapped = pdf.splitTextToSize(text, contentWidth);
    ensureSpace(wrapped.length * lineHeight + 4);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(color);
    pdf.text(wrapped, marginX, cursorY);
    cursorY += wrapped.length * lineHeight + 6;
  };

  const writeDivider = () => {
    ensureSpace(12);
    pdf.setDrawColor("#d1d5db");
    pdf.setLineWidth(0.6);
    pdf.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 12;
  };

  writeTitle("Trading Pi - AI Trading Terminal", 18, "#0f766e");
  writeParagraph(`Exported on ${new Date().toLocaleString()}`, "#6b7280");
  writeDivider();

  for (const item of items) {
    if (item.role === "user" || item.role === "assistant") {
      writeLabel(item.role === "user" ? "User" : "Assistant");
      if (item.thinking) {
        writeParagraph(`Thinking: ${item.thinking}`, "#4b5563");
      }
      if (item.text) {
        writeParagraph(item.text);
      }
      writeDivider();
      continue;
    }

    if (item.role === "tool") {
      writeLabel(`Tool: ${item.toolName || "unknown"}`);
      writeParagraph(`Input: ${item.toolArgs || "{}"}`, "#374151");
      writeDivider();
      continue;
    }

    if (item.role === "tool_result") {
      writeLabel("Result");
      writeParagraph(item.toolResult || "");
      writeDivider();
    }
  }

  const pdfBlob = pdf.output("blob");
  downloadBlob(pdfBlob, `${filenamePrefix}-${dateStr}.pdf`, "application/pdf");
}

/** Helper: create a Blob and trigger browser download */
function downloadBlob(content: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
