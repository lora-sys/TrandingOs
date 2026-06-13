import { DownloadIcon, FileTextIcon, FileCodeIcon, FileIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ChatItemForExport = {
  role: "user" | "assistant" | "tool" | "tool_result" | "system";
  text?: string;
  thinking?: string;
  toolName?: string;
  toolArgs?: string;
  toolResult?: string;
};

type ExportMenuProps = {
  items: ChatItemForExport[];
  filenamePrefix?: string;
};

/** Export as styled HTML document */
function exportAsHtml(items: ChatItemForExport[], filenamePrefix: string) {
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

  // Tool calls section
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

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${dateStr}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export as Markdown */
function exportAsMarkdown(items: ChatItemForExport[], filenamePrefix: string) {
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
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${dateStr}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export as PDF using html2pdf.js */
async function exportAsPdf(items: ChatItemForExport[], filenamePrefix: string) {
  // Dynamic import to avoid loading html2pdf until needed
  const html2pdf = (await import("html2pdf.js")).default;
  const dateStr = new Date().toISOString().slice(0, 10);

  // Build printable HTML (lighter version for PDF)
  const messagesHtml = items
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => {
      const role = item.role === "user" ? "User" : "Assistant";
      let content = "";
      if (item.thinking)
        content += `<p style="color:#666;font-size:11px;margin:4px 0"><em>Thinking:</em></p><pre style="background:#f5f5f5;padding:8px;border-radius:4px;font-size:11px;white-space:pre-wrap">${escapeHtml(item.thinking)}</pre>`;
      if (item.text)
        content += `<pre style="white-space:pre-wrap;font-size:12px">${escapeHtml(item.text)}</pre>`;
      return `<div style="margin:10px 0;padding:12px;border-radius:6px;border-left:3px solid ${item.role === "user" ? "#06b6d4" : "#8b5cf6"};background:#fafafa"><strong style="font-size:11px;text-transform:uppercase;color:${item.role === "user" ? "#06b6d4" : "#8b5cf6"}">${role}</strong>${content}</div>`;
    })
    .join("\n");

  const container = document.createElement("div");
  container.innerHTML = `
    <div style="font-family:'JetBrains Mono',monospace;max-width:700px;margin:0 auto;padding:32px 24px;color:#1a1a2e">
      <h1 style="color:#06b6d4;font-size:18px;margin-bottom:4px">Trading Pi — AI Trading Terminal</h1>
      <p style="color:#888;font-size:11px;margin-bottom:20px">Exported on ${new Date().toLocaleString()}</p>
      ${messagesHtml}
    </div>`;
  document.body.appendChild(container);

  try {
    await html2pdf()
      .set({
        margin: [12, 12],
        filename: `${filenamePrefix}-${dateStr}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ExportMenu({ items, filenamePrefix = "trading-pi-chat" }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
          title="Export conversation"
        >
          <DownloadIcon className="size-3.5" />
          Export
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 bg-card/95 backdrop-blur-xl border-white/[0.08]">
        <DropdownMenuItem onClick={() => exportAsHtml(items, filenamePrefix)} className="gap-2.5 cursor-pointer">
          <FileTextIcon className="size-4 text-cyan-400" />
          <div>
            <div className="text-sm font-medium">HTML</div>
            <div className="text-[10px] text-muted-foreground">Styled dark theme</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportAsMarkdown(items, filenamePrefix)} className="gap-2.5 cursor-pointer">
          <FileCodeIcon className="size-4 text-purple-400" />
          <div>
            <div className="text-sm font-medium">Markdown</div>
            <div className="text-[10px] text-muted-foreground">Portable text</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportAsPdf(items, filenamePrefix)} className="gap-2.5 cursor-pointer">
          <FileIcon className="size-4 text-red-400" />
          <div>
            <div className="text-sm font-medium">PDF</div>
            <div className="text-[10px] text-muted-foreground">Print-ready</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
