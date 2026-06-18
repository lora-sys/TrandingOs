/** Shared workspace tab configuration */

export type WorkspaceTab = "overview" | "research" | "decisions" | "journal" | "review";

export const workspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "research", label: "Research" },
  { id: "decisions", label: "Decisions" },
  { id: "journal", label: "Journal" },
  { id: "review", label: "Review" },
];
