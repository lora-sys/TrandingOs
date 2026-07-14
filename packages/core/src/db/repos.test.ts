import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TradingPiDatabase } from "./database.js";
import {
  AlphaRepo,
  ApprovalRepo,
  ArtifactRepo,
  AuditRepo,
  DecisionRepo,
  EvolutionRepo,
  InfrastructureRepo,
  JournalRepo,
  MemoryRepo,
  PaperTradingRepo,
  Repositories,
  ReviewRepo,
  TimelineRepo,
  WorkspaceRepo,
} from "./repositories.js";

function testDatabase(): { database: TradingPiDatabase; dir: string } {
  const dir = mkdtempSync(resolve(tmpdir(), "trading-pi-repos-test-"));
  const database = new TradingPiDatabase(resolve(dir, "test.db"));
  database.migrate();
  return { database, dir };
}

function cleanup(database: TradingPiDatabase, dir: string) {
  database.close();
  rmSync(dir, { recursive: true, force: true });
}

describe("Repositories facade", () => {
  it("constructs every expected sub-repo exactly once", () => {
    const { database, dir } = testDatabase();
    try {
      const repos = new Repositories(database);
      expect(repos.audit).toBeInstanceOf(AuditRepo);
      expect(repos.timeline).toBeInstanceOf(TimelineRepo);
      expect(repos.memory).toBeInstanceOf(MemoryRepo);
      expect(repos.workspace).toBeInstanceOf(WorkspaceRepo);
      expect(repos.decision).toBeInstanceOf(DecisionRepo);
      expect(repos.paperTrading).toBeInstanceOf(PaperTradingRepo);
      expect(repos.journal).toBeInstanceOf(JournalRepo);
      expect(repos.review).toBeInstanceOf(ReviewRepo);
      expect(repos.artifact).toBeInstanceOf(ArtifactRepo);
      expect(repos.approval).toBeInstanceOf(ApprovalRepo);
      expect(repos.evolution).toBeInstanceOf(EvolutionRepo);
      expect(repos.alpha).toBeInstanceOf(AlphaRepo);
      expect(repos.infrastructure).toBeInstanceOf(InfrastructureRepo);
    } finally {
      cleanup(database, dir);
    }
  });

  it("delegates facade methods to sub-repo methods (bound)", () => {
    const { database, dir } = testDatabase();
    try {
      const repos = new Repositories(database);
      const pairs: Array<[unknown, unknown]> = [
        [repos.createTimeline, repos.timeline.createTimeline],
        [repos.createAuditRecord, repos.audit.createAuditRecord],
        [repos.upsertMemory, repos.memory.upsertMemory],
        [repos.writeMemory, repos.memory.writeMemory],
        [repos.queryMemory, repos.memory.queryMemory],
        [repos.deleteMemory, repos.memory.deleteMemory],
        [repos.upsertWorkspace, repos.workspace.upsertWorkspace],
        [repos.createWorkspace, repos.workspace.createWorkspace],
        [repos.listWorkspaces, repos.workspace.listWorkspaces],
        [repos.getWorkspace, repos.workspace.getWorkspace],
        [repos.updateWorkspace, repos.workspace.updateWorkspace],
        [repos.deleteWorkspace, repos.workspace.deleteWorkspace],
        [repos.linkWorkspace, repos.workspace.linkWorkspace],
        [repos.workspaceContext, repos.workspace.workspaceContext],
        [repos.ensureDefaultWorkspace, repos.workspace.ensureDefaultWorkspace],
        [repos.createDecision, repos.decision.createDecision],
        [repos.updateDecisionStatus, repos.decision.updateDecisionStatus],
        [repos.listDecisions, repos.decision.listDecisions],
        [repos.getDecision, repos.decision.getDecision],
        [repos.createPaperOrder, repos.paperTrading.createPaperOrder],
        [repos.createPaperTrade, repos.paperTrading.createPaperTrade],
        [repos.settlePaperTrade, repos.paperTrading.settlePaperTrade],
        [repos.cancelPaperTrade, repos.paperTrading.cancelPaperTrade],
        [repos.updatePaperTrade, repos.paperTrading.updatePaperTrade],
        [repos.partialClosePaperTrade, repos.paperTrading.partialClosePaperTrade],
        [repos.listPaperTrades, repos.paperTrading.listPaperTrades],
        [repos.getPaperTrade, repos.paperTrading.getPaperTrade],
        [repos.createJournalEntry, repos.journal.createJournalEntry],
        [repos.attachJournalArtifact, repos.journal.attachJournalArtifact],
        [repos.createReview, repos.review.createReview],
        [repos.attachReviewArtifact, repos.review.attachReviewArtifact],
        [repos.listReviews, repos.review.listReviews],
        [repos.getReview, repos.review.getReview],
        [repos.reviewMetrics, repos.review.reviewMetrics],
        [repos.createArtifact, repos.artifact.createArtifact],
        [repos.getArtifact, repos.artifact.getArtifact],
        [repos.createApproval, repos.approval.createApproval],
        [repos.updateApprovalStatus, repos.approval.updateApprovalStatus],
        [repos.createEvolutionProposal, repos.evolution.createEvolutionProposal],
        [repos.createEvolutionSuggestion, repos.evolution.createEvolutionSuggestion],
        [repos.listEvolutionSuggestions, repos.evolution.listEvolutionSuggestions],
        [repos.getEvolutionSuggestion, repos.evolution.getEvolutionSuggestion],
        [repos.updateEvolutionSuggestionStatus, repos.evolution.updateEvolutionSuggestionStatus],
        [repos.createResearchSession, repos.alpha.createResearchSession],
        [repos.updateResearchSession, repos.alpha.updateResearchSession],
        [repos.listResearchSessions, repos.alpha.listResearchSessions],
        [repos.getResearchSession, repos.alpha.getResearchSession],
        [repos.upsertStrategy, repos.alpha.upsertStrategy],
        [repos.createBacktest, repos.alpha.createBacktest],
        [repos.portfolioSnapshot, repos.alpha.portfolioSnapshot],
        [repos.upsertMarketPrice, repos.alpha.upsertMarketPrice],
        [repos.listMarketPrices, repos.alpha.listMarketPrices],
        [repos.upsertOhlcvCandles, repos.alpha.upsertOhlcvCandles],
        [repos.getOhlcvCandles, repos.alpha.getOhlcvCandles],
        [repos.cacheSearchResults, repos.alpha.cacheSearchResults],
        [repos.list, repos.infrastructure.list],
        [repos.upsertSkill, repos.infrastructure.upsertSkill],
        [repos.upsertWorkflow, repos.infrastructure.upsertWorkflow],
        [repos.createWorkflowRun, repos.infrastructure.createWorkflowRun],
        [repos.finishWorkflowRun, repos.infrastructure.finishWorkflowRun],
        [repos.createSkillRun, repos.infrastructure.createSkillRun],
        [repos.finishSkillRun, repos.infrastructure.finishSkillRun],
        [repos.createPlan, repos.infrastructure.createPlan],
        [repos.updatePlanStatus, repos.infrastructure.updatePlanStatus],
        [repos.listPlans, repos.infrastructure.listPlans],
        [repos.getPlan, repos.infrastructure.getPlan],
        [repos.setCache, repos.infrastructure.setCache],
        [repos.getCache, repos.infrastructure.getCache],
        [repos.upsertMcpServer, repos.infrastructure.upsertMcpServer],
        [repos.createMcpDiscovery, repos.infrastructure.createMcpDiscovery],
        [repos.updateMcpServer, repos.infrastructure.updateMcpServer],
        [repos.upsertMcpPermission, repos.infrastructure.upsertMcpPermission],
        [repos.createBrowserSession, repos.infrastructure.createBrowserSession],
        [repos.upsertMarketplaceItem, repos.infrastructure.upsertMarketplaceItem],
      ];

      for (const [facade, sub] of pairs) {
        expect(typeof facade).toBe("function");
        expect(typeof sub).toBe("function");
        const facadeName = (facade as { name: string }).name;
        const subName = (sub as { name: string }).name;
        // The facade method is bound (name starts with "bound "), the raw
        // sub-repo method is not. After stripping the "bound " prefix from
        // the facade name, the two should match.
        expect(facadeName.startsWith("bound ")).toBe(true);
        expect(facadeName.replace(/^bound /, "")).toBe(subName);
      }
    } finally {
      cleanup(database, dir);
    }
  });

  it("preserves backward-compatible method names end-to-end", () => {
    const { database, dir } = testDatabase();
    try {
      const repos = new Repositories(database);

      // createWorkspace still creates a row and returns the record.
      const workspace = repos.createWorkspace({
        name: "Test Workspace",
        topicType: "general",
        creatorSessionId: "ses_test",
        context: { purpose: "verify backward-compat" },
      });
      expect(workspace.id).toMatch(/^wrk_/);
      expect(workspace.name).toBe("Test Workspace");
      expect(workspace.context).toEqual({ purpose: "verify backward-compat" });

      // getWorkspace still works.
      expect(repos.getWorkspace(workspace.id)?.id).toBe(workspace.id);

      // listWorkspaces still works.
      const all = repos.listWorkspaces();
      expect(all.find((w) => w.id === workspace.id)).toBeDefined();

      // Generic list() still works across many tables.
      expect(Array.isArray(repos.list("workspaces"))).toBe(true);
      expect(Array.isArray(repos.list("memory_records"))).toBe(true);

      // createTimeline still returns an id and shows up in the list.
      const eventId = repos.createTimeline({
        type: "test",
        title: "backward-compat check",
        status: "info",
      });
      expect(eventId).toMatch(/^evt_/);
      const events = repos.list("timeline_events") as Array<{ id: string }>;
      expect(events.find((e) => e.id === eventId)).toBeDefined();
    } finally {
      cleanup(database, dir);
    }
  });
});
