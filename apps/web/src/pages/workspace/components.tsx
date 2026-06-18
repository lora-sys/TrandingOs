/**
 * Workspace page barrel — shared types, small UI primitives, and re-exports.
 *
 * Tab-level components (OverviewTab, DecisionsTab, JournalTab, ReviewTab,
 * ResearchTab) live in their own files under this directory.
 */

export type { WorkspaceTab } from "./WorkspaceTabs";
export { workspaceTabs } from "./WorkspaceTabs";

// Small shared UI primitives (too small to warrant their own file)
export { WorkspaceEmpty, ResearchSessionList } from "./WorkspaceShared";

// Barrel re-exports for backward-compatible imports
export { OverviewTab } from "./OverviewTab";
export { DecisionsTab } from "./DecisionsTab";
export { JournalTab } from "./JournalTab";
export { ReviewTab } from "./ReviewTab";
export { ResearchTab } from "./ResearchTab";
