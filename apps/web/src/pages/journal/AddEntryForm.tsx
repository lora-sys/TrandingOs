/**
 * Add Entry form sub-component for JournalPage.
 *
 * Extracted from JournalPage.tsx inline JSX.
 * Handles manual 4-dimension journal entry creation.
 */

import { motion } from "framer-motion";
import { FileTextIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tradingPiApi } from "@/api/client";
import { moodOptions } from "./journal-types";

interface AddEntryFormProps {
  open: boolean;
  workspaces: any[];
  newWorkspaceId: string;
  setNewWorkspaceId: (v: string) => void;
  newMood: string;
  setNewMood: (v: string) => void;
  newDiscipline: number;
  setNewDiscipline: (v: number) => void;
  newNotes: string;
  setNewNotes: (v: string) => void;
}

export function AddEntryForm({
  open,
  workspaces,
  newWorkspaceId,
  setNewWorkspaceId,
  newMood,
  setNewMood,
  newDiscipline,
  setNewDiscipline,
  newNotes,
  setNewNotes,
}: AddEntryFormProps) {
  const queryClient = useQueryClient();

  const createJournal = useMutation({
    mutationFn: () =>
      tradingPiApi.createJournal({
        workspaceId: newWorkspaceId === "global" ? undefined : newWorkspaceId,
        mood: newMood,
        disciplineScore: newDiscipline,
        notes: newNotes.trim(),
      }),
    onSuccess: () => {
      setNewNotes("");
      queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
  });

  if (!open) return null;

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-lg border border-cyan-400/20 bg-card/70 p-4 backdrop-blur-xl"
      initial={{ opacity: 0, y: -6 }}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <FileTextIcon className="size-4 text-cyan-300" />
        Manual 4-dimension entry
      </div>
      <div className="grid gap-3 lg:grid-cols-[220px_170px_160px]">
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
          onChange={(event) => setNewWorkspaceId(event.target.value)}
          value={newWorkspaceId}
        >
          <option value="global">Global note</option>
          {workspaces.map((workspace: any) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
          onChange={(event) => setNewMood(event.target.value)}
          value={newMood}
        >
          {moodOptions.map((mood) => (
            <option key={mood} value={mood}>
              {mood}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
          Discipline
          <input
            aria-label="Discipline score"
            className="min-w-0 flex-1 accent-cyan-300"
            max={100}
            min={0}
            onChange={(event) => setNewDiscipline(Number(event.target.value))}
            type="range"
            value={newDiscipline}
          />
          <span className="w-7 text-right text-foreground">{newDiscipline}</span>
        </label>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
        <textarea
          className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
          onChange={(event) => setNewNotes(event.target.value)}
          placeholder="Trade data, reasoning, emotion, and reflection..."
          value={newNotes}
        />
        <button
          className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!newNotes.trim() || createJournal.isPending}
          onClick={() => createJournal.mutate()}
          type="button"
        >
          Save Entry
        </button>
      </div>
    </motion.section>
  );
}
