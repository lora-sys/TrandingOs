export interface JournalEntryInput {
  tradeId?: string;
  planArtifactId?: string;
  mood?: string;
  disciplineScore?: number;
  rulesViolated?: string[];
  notes: string;
  screenshotPath?: string;
}

export function normalizeJournalInput(input: JournalEntryInput) {
  return {
    ...input,
    disciplineScore: Math.max(0, Math.min(100, input.disciplineScore ?? 0)),
    rulesViolated: input.rulesViolated ?? [],
  };
}
