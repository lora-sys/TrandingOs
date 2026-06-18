/**
 * Journal page types and constants.
 *
 * Extracted from JournalPage.tsx for testability and reuse.
 */

import type { JournalCardEntry, JournalCardTrade } from "@/components/mvp";

/** Normalized journal entry with raw notes preserved for export */
export type NormalizedEntry = JournalCardEntry & {
  rawNotes?: string | null;
};

/** Date range filter options */
export const dateRanges = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
] as const;

/** Mood options for journal entries */
export const moodOptions = ["Analytical", "Neutral", "FOMO", "Fear", "Overconfident", "Bored"] as const;
