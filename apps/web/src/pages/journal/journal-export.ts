/**
 * Journal export/download utilities.
 *
 * Extracted from JournalPage.tsx — handles CSV and Markdown export
 * of journal entries with associated trade data.
 */

import type { NormalizedEntry } from "./journal-types";
import type { JournalCardTrade } from "@/components/mvp";
import { formatSignedMoney } from "@/lib/formatters";
import { outcomeForTrade, workspaceName } from "./journal-utils";

// ─── CSV Export ─────────────────────────────────────────

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Export journal entries as CSV file */
export function downloadCsv(
  entries: NormalizedEntry[],
  tradeById: Map<string | undefined, JournalCardTrade>,
  workspaces: any[],
): void {
  const rows = [
    [
      "created_at",
      "workspace",
      "direction",
      "asset",
      "entry_price",
      "exit_price",
      "pnl",
      "mood",
      "discipline",
      "notes",
    ],
    ...entries.map((entry) => {
      const trade = entry.paperTradeId ? tradeById.get(entry.paperTradeId) : undefined;
      return [
        entry.createdAt ?? "",
        workspaceName(workspaces, entry.workspaceId),
        trade?.direction ?? "",
        trade?.asset ?? "",
        trade?.entryPrice ?? "",
        trade?.exitPrice ?? "",
        trade?.pnl ?? "",
        entry.mood ?? "",
        entry.disciplineScore ?? "",
        entry.rawNotes ?? "",
      ].map(csvCell);
    }),
  ];
  downloadFile(
    "trading-pi-journal.csv",
    rows.map((row) => row.join(",")).join("\n"),
    "text/csv",
  );
}

// ─── Markdown Export ────────────────────────────────────

/** Export journal entries as Markdown file */
export function downloadMarkdown(
  entries: NormalizedEntry[],
  tradeById: Map<string | undefined, JournalCardTrade>,
  workspaces: any[],
): void {
  const markdown = `# Trading Pi Journal Export\n\n${entries
    .map((entry) => {
      const trade = entry.paperTradeId ? tradeById.get(entry.paperTradeId) : undefined;
      return `## ${entry.createdAt ?? entry.id}\n\n` +
        `- Workspace: ${workspaceName(workspaces, entry.workspaceId)}\n` +
        `- Outcome: ${outcomeForTrade(trade)}\n` +
        `- Asset: ${trade?.asset ?? "n/a"}\n` +
        `- P&L: ${formatSignedMoney(Number(trade?.pnl ?? 0))}\n` +
        `- Mood: ${entry.mood ?? "n/a"}\n\n` +
        `${entry.rawNotes ?? ""}\n`;
    })
    .join("\n")}`;
  downloadFile("trading-pi-journal.md", markdown, "text/markdown");
}

// ─── File Download Helper ───────────────────────────────

/** Trigger browser file download from in-memory content */
function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
