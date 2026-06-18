/**
 * JournalTab — Journal entry form + entry list with trade linkage.
 *
 * Extracted from workspace/components.tsx.
 */

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpenIcon } from "lucide-react";
import { tradingPiApi } from "@/api/client";
import { JournalEntryCard } from "@/components/mvp";
import { normalizeJournalEntry, normalizeJournalTrade } from "./workspace-utils";
import { WorkspaceEmpty } from "./components";

export function JournalTab({ entries, trades, workspaceId, workspaceName }: { entries: any[]; trades: any[]; workspaceId: string; workspaceName: string }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const tradeById = useMemo(() => new Map(trades.map((trade) => [trade.id, normalizeJournalTrade(trade)])), [trades]);
  const createJournal = useMutation({
    mutationFn: () => tradingPiApi.createJournal({ workspaceId, notes, disciplineScore: 75 }),
    onSuccess: () => {
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
  });
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-lg border bg-card/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <BookOpenIcon className="size-4 text-cyan-300" />
          Add Entry
        </div>
        <textarea className="min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50" onChange={(event) => setNotes(event.target.value)} placeholder="Journal notes" value={notes} />
        <button className="mt-3 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black disabled:opacity-50" disabled={!notes.trim() || createJournal.isPending} onClick={() => createJournal.mutate()} type="button">Save Entry</button>
      </section>
      <section className="space-y-3">
        {entries.length === 0 ? <WorkspaceEmpty text="No journal entries for this workspace." /> : entries.map((entry) => {
          const normalized = normalizeJournalEntry(entry, workspaceId);
          return (
            <JournalEntryCard
              entry={normalized}
              expanded={expandedId === normalized.id}
              key={normalized.id}
              onToggle={() => setExpandedId((current) => current === normalized.id ? null : normalized.id)}
              trade={normalized.paperTradeId ? tradeById.get(normalized.paperTradeId) : undefined}
              workspaceName={workspaceName}
            />
          );
        })}
      </section>
    </div>
  );
}
