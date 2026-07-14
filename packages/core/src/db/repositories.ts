import type { TradingPiDatabase } from "./database.js";
import { AlphaRepo } from "./repos/alpha-repo.js";
import { ApprovalRepo } from "./repos/approval-repo.js";
import { ArtifactRepo } from "./repos/artifact-repo.js";
import { AuditRepo } from "./repos/audit-repo.js";
import { DecisionRepo } from "./repos/decision-repo.js";
import { EvolutionRepo } from "./repos/evolution-repo.js";
import { InfrastructureRepo } from "./repos/infrastructure-repo.js";
import { JournalRepo } from "./repos/journal-repo.js";
import { MemoryRepo } from "./repos/memory-repo.js";
import { PaperTradingRepo } from "./repos/paper-trading-repo.js";
import { ReviewRepo } from "./repos/review-repo.js";
import { TimelineRepo } from "./repos/timeline-repo.js";
import { WorkspaceRepo } from "./repos/workspace-repo.js";
import type { RepositoriesSurface } from "./repositories-surface.js";

// Re-export shared types and helpers so existing imports keep working.
export { appendSettlementNotes, directionSign, id, nowIso, parseJson } from "./repos/_helpers.js";
export type {
  DecisionRow,
  EvolutionSuggestionRow,
  PaperTradeRow,
  ResearchSessionRow,
  ReviewRow,
  WorkspaceRow,
} from "./repos/_helpers.js";
export type {
  DecisionConfidence,
  DecisionDirection,
  DecisionRecord,
  DecisionRiskLevel,
  DecisionStatus,
  EvolutionSuggestionRecord,
  PaperTradeRecord,
  PaperTradeStatus,
  ResearchSessionRecord,
  ResearchSessionStatus,
  ReviewRecord,
  RunStatus,
  WorkspaceRecord,
} from "./repos/_types.js";

// Re-export the per-domain repos so external code can reach them directly.
export { AlphaRepo } from "./repos/alpha-repo.js";
export { ApprovalRepo } from "./repos/approval-repo.js";
export { ArtifactRepo } from "./repos/artifact-repo.js";
export { AuditRepo } from "./repos/audit-repo.js";
export { DecisionRepo } from "./repos/decision-repo.js";
export { EvolutionRepo } from "./repos/evolution-repo.js";
export { InfrastructureRepo } from "./repos/infrastructure-repo.js";
export { JournalRepo } from "./repos/journal-repo.js";
export { MemoryRepo } from "./repos/memory-repo.js";
export { PaperTradingRepo } from "./repos/paper-trading-repo.js";
export { ReviewRepo } from "./repos/review-repo.js";
export { TimelineRepo } from "./repos/timeline-repo.js";
export { WorkspaceRepo } from "./repos/workspace-repo.js";
export type { RepositoriesSurface } from "./repositories-surface.js";

/**
 * Thin facade that composes the per-domain repositories and exposes their
 * methods directly so existing callers (`repos.createWorkspace(...)`, etc.)
 * keep working without any change.
 *
 * No behavior change from the pre-split god object — every method is
 * a bound reference to the corresponding sub-repo.
 */
export class Repositories implements RepositoriesSurface {
  readonly audit: AuditRepo;
  readonly timeline: TimelineRepo;
  readonly memory: MemoryRepo;
  readonly workspace: WorkspaceRepo;
  readonly decision: DecisionRepo;
  readonly paperTrading: PaperTradingRepo;
  readonly journal: JournalRepo;
  readonly review: ReviewRepo;
  readonly artifact: ArtifactRepo;
  readonly approval: ApprovalRepo;
  readonly evolution: EvolutionRepo;
  readonly alpha: AlphaRepo;
  readonly infrastructure: InfrastructureRepo;

  // Backward-compat method surface — bound in the constructor.
  declare readonly createTimeline: TimelineRepo["createTimeline"];
  declare readonly createSessionFork: TimelineRepo["createSessionFork"];
  declare readonly createAuditRecord: AuditRepo["createAuditRecord"];
  declare readonly upsertMemory: MemoryRepo["upsertMemory"];
  declare readonly writeMemory: MemoryRepo["writeMemory"];
  declare readonly queryMemory: MemoryRepo["queryMemory"];
  declare readonly deleteMemory: MemoryRepo["deleteMemory"];
  declare readonly upsertWorkspace: WorkspaceRepo["upsertWorkspace"];
  declare readonly createWorkspace: WorkspaceRepo["createWorkspace"];
  declare readonly listWorkspaces: WorkspaceRepo["listWorkspaces"];
  declare readonly getWorkspace: WorkspaceRepo["getWorkspace"];
  declare readonly updateWorkspace: WorkspaceRepo["updateWorkspace"];
  declare readonly deleteWorkspace: WorkspaceRepo["deleteWorkspace"];
  declare readonly linkWorkspace: WorkspaceRepo["linkWorkspace"];
  declare readonly workspaceContext: WorkspaceRepo["workspaceContext"];
  declare readonly ensureDefaultWorkspace: WorkspaceRepo["ensureDefaultWorkspace"];
  declare readonly createDecision: DecisionRepo["createDecision"];
  declare readonly updateDecisionStatus: DecisionRepo["updateDecisionStatus"];
  declare readonly listDecisions: DecisionRepo["listDecisions"];
  declare readonly getDecision: DecisionRepo["getDecision"];
  declare readonly createPaperOrder: PaperTradingRepo["createPaperOrder"];
  declare readonly createPaperTrade: PaperTradingRepo["createPaperTrade"];
  declare readonly settlePaperTrade: PaperTradingRepo["settlePaperTrade"];
  declare readonly cancelPaperTrade: PaperTradingRepo["cancelPaperTrade"];
  declare readonly updatePaperTrade: PaperTradingRepo["updatePaperTrade"];
  declare readonly partialClosePaperTrade: PaperTradingRepo["partialClosePaperTrade"];
  declare readonly listPaperTrades: PaperTradingRepo["listPaperTrades"];
  declare readonly getPaperTrade: PaperTradingRepo["getPaperTrade"];
  declare readonly createJournalEntry: JournalRepo["createJournalEntry"];
  declare readonly attachJournalArtifact: JournalRepo["attachJournalArtifact"];
  declare readonly createReview: ReviewRepo["createReview"];
  declare readonly attachReviewArtifact: ReviewRepo["attachReviewArtifact"];
  declare readonly listReviews: ReviewRepo["listReviews"];
  declare readonly getReview: ReviewRepo["getReview"];
  declare readonly reviewMetrics: ReviewRepo["reviewMetrics"];
  declare readonly createArtifact: ArtifactRepo["createArtifact"];
  declare readonly getArtifact: ArtifactRepo["getArtifact"];
  declare readonly createApproval: ApprovalRepo["createApproval"];
  declare readonly updateApprovalStatus: ApprovalRepo["updateApprovalStatus"];
  declare readonly createEvolutionProposal: EvolutionRepo["createEvolutionProposal"];
  declare readonly createEvolutionSuggestion: EvolutionRepo["createEvolutionSuggestion"];
  declare readonly listEvolutionSuggestions: EvolutionRepo["listEvolutionSuggestions"];
  declare readonly getEvolutionSuggestion: EvolutionRepo["getEvolutionSuggestion"];
  declare readonly updateEvolutionSuggestionStatus: EvolutionRepo["updateEvolutionSuggestionStatus"];
  declare readonly createResearchSession: AlphaRepo["createResearchSession"];
  declare readonly updateResearchSession: AlphaRepo["updateResearchSession"];
  declare readonly listResearchSessions: AlphaRepo["listResearchSessions"];
  declare readonly getResearchSession: AlphaRepo["getResearchSession"];
  declare readonly upsertStrategy: AlphaRepo["upsertStrategy"];
  declare readonly createBacktest: AlphaRepo["createBacktest"];
  declare readonly portfolioSnapshot: AlphaRepo["portfolioSnapshot"];
  declare readonly upsertMarketPrice: AlphaRepo["upsertMarketPrice"];
  declare readonly getLatestMarketPrice: AlphaRepo["getLatestMarketPrice"];
  declare readonly listMarketPrices: AlphaRepo["listMarketPrices"];
  declare readonly upsertOhlcvCandles: AlphaRepo["upsertOhlcvCandles"];
  declare readonly getOhlcvCandles: AlphaRepo["getOhlcvCandles"];
  declare readonly getCachedSearchResults: AlphaRepo["getCachedSearchResults"];
  declare readonly cacheSearchResults: AlphaRepo["cacheSearchResults"];
  declare readonly list: InfrastructureRepo["list"];
  declare readonly upsertSkill: InfrastructureRepo["upsertSkill"];
  declare readonly upsertWorkflow: InfrastructureRepo["upsertWorkflow"];
  declare readonly createWorkflowRun: InfrastructureRepo["createWorkflowRun"];
  declare readonly finishWorkflowRun: InfrastructureRepo["finishWorkflowRun"];
  declare readonly createSkillRun: InfrastructureRepo["createSkillRun"];
  declare readonly finishSkillRun: InfrastructureRepo["finishSkillRun"];
  declare readonly createPlan: InfrastructureRepo["createPlan"];
  declare readonly updatePlanStatus: InfrastructureRepo["updatePlanStatus"];
  declare readonly listPlans: InfrastructureRepo["listPlans"];
  declare readonly getPlan: InfrastructureRepo["getPlan"];
  declare readonly setCache: InfrastructureRepo["setCache"];
  declare readonly getCache: InfrastructureRepo["getCache"];
  declare readonly upsertMcpServer: InfrastructureRepo["upsertMcpServer"];
  declare readonly createMcpDiscovery: InfrastructureRepo["createMcpDiscovery"];
  declare readonly updateMcpServer: InfrastructureRepo["updateMcpServer"];
  declare readonly upsertMcpPermission: InfrastructureRepo["upsertMcpPermission"];
  declare readonly createBrowserSession: InfrastructureRepo["createBrowserSession"];
  declare readonly upsertMarketplaceItem: InfrastructureRepo["upsertMarketplaceItem"];

  constructor(private readonly database: TradingPiDatabase) {
    this.audit = new AuditRepo(database);
    this.timeline = new TimelineRepo(database);
    this.memory = new MemoryRepo(database, this.audit);
    this.workspace = new WorkspaceRepo(database, this.memory);
    this.decision = new DecisionRepo(database, this.timeline);
    this.journal = new JournalRepo(database);
    this.paperTrading = new PaperTradingRepo(database, this.timeline);
    this.review = new ReviewRepo(database);
    this.artifact = new ArtifactRepo(database);
    this.approval = new ApprovalRepo(database);
    this.evolution = new EvolutionRepo(database);
    this.alpha = new AlphaRepo(database, this.timeline);
    this.infrastructure = new InfrastructureRepo(database);

    Object.assign(this, {
      createTimeline: this.timeline.createTimeline.bind(this.timeline),
      createSessionFork: this.timeline.createSessionFork.bind(this.timeline),
      createAuditRecord: this.audit.createAuditRecord.bind(this.audit),
      upsertMemory: this.memory.upsertMemory.bind(this.memory),
      writeMemory: this.memory.writeMemory.bind(this.memory),
      queryMemory: this.memory.queryMemory.bind(this.memory),
      deleteMemory: this.memory.deleteMemory.bind(this.memory),
      upsertWorkspace: this.workspace.upsertWorkspace.bind(this.workspace),
      createWorkspace: this.workspace.createWorkspace.bind(this.workspace),
      listWorkspaces: this.workspace.listWorkspaces.bind(this.workspace),
      getWorkspace: this.workspace.getWorkspace.bind(this.workspace),
      updateWorkspace: this.workspace.updateWorkspace.bind(this.workspace),
      deleteWorkspace: this.workspace.deleteWorkspace.bind(this.workspace),
      linkWorkspace: this.workspace.linkWorkspace.bind(this.workspace),
      workspaceContext: this.workspace.workspaceContext.bind(this.workspace),
      ensureDefaultWorkspace: this.workspace.ensureDefaultWorkspace.bind(this.workspace),
      createDecision: this.decision.createDecision.bind(this.decision),
      updateDecisionStatus: this.decision.updateDecisionStatus.bind(this.decision),
      listDecisions: this.decision.listDecisions.bind(this.decision),
      getDecision: this.decision.getDecision.bind(this.decision),
      createPaperOrder: this.paperTrading.createPaperOrder.bind(this.paperTrading),
      createPaperTrade: this.paperTrading.createPaperTrade.bind(this.paperTrading),
      settlePaperTrade: this.paperTrading.settlePaperTrade.bind(this.paperTrading),
      cancelPaperTrade: this.paperTrading.cancelPaperTrade.bind(this.paperTrading),
      updatePaperTrade: this.paperTrading.updatePaperTrade.bind(this.paperTrading),
      partialClosePaperTrade: this.paperTrading.partialClosePaperTrade.bind(this.paperTrading),
      listPaperTrades: this.paperTrading.listPaperTrades.bind(this.paperTrading),
      getPaperTrade: this.paperTrading.getPaperTrade.bind(this.paperTrading),
      createJournalEntry: this.journal.createJournalEntry.bind(this.journal),
      attachJournalArtifact: this.journal.attachJournalArtifact.bind(this.journal),
      createReview: this.review.createReview.bind(this.review),
      attachReviewArtifact: this.review.attachReviewArtifact.bind(this.review),
      listReviews: this.review.listReviews.bind(this.review),
      getReview: this.review.getReview.bind(this.review),
      reviewMetrics: this.review.reviewMetrics.bind(this.review),
      createArtifact: this.artifact.createArtifact.bind(this.artifact),
      getArtifact: this.artifact.getArtifact.bind(this.artifact),
      createApproval: this.approval.createApproval.bind(this.approval),
      updateApprovalStatus: this.approval.updateApprovalStatus.bind(this.approval),
      createEvolutionProposal: this.evolution.createEvolutionProposal.bind(this.evolution),
      createEvolutionSuggestion: this.evolution.createEvolutionSuggestion.bind(this.evolution),
      listEvolutionSuggestions: this.evolution.listEvolutionSuggestions.bind(this.evolution),
      getEvolutionSuggestion: this.evolution.getEvolutionSuggestion.bind(this.evolution),
      updateEvolutionSuggestionStatus: this.evolution.updateEvolutionSuggestionStatus.bind(this.evolution),
      createResearchSession: this.alpha.createResearchSession.bind(this.alpha),
      updateResearchSession: this.alpha.updateResearchSession.bind(this.alpha),
      listResearchSessions: this.alpha.listResearchSessions.bind(this.alpha),
      getResearchSession: this.alpha.getResearchSession.bind(this.alpha),
      upsertStrategy: this.alpha.upsertStrategy.bind(this.alpha),
      createBacktest: this.alpha.createBacktest.bind(this.alpha),
      portfolioSnapshot: this.alpha.portfolioSnapshot.bind(this.alpha),
      upsertMarketPrice: this.alpha.upsertMarketPrice.bind(this.alpha),
      getLatestMarketPrice: this.alpha.getLatestMarketPrice.bind(this.alpha),
      listMarketPrices: this.alpha.listMarketPrices.bind(this.alpha),
      upsertOhlcvCandles: this.alpha.upsertOhlcvCandles.bind(this.alpha),
      getOhlcvCandles: this.alpha.getOhlcvCandles.bind(this.alpha),
      getCachedSearchResults: this.alpha.getCachedSearchResults.bind(this.alpha),
      cacheSearchResults: this.alpha.cacheSearchResults.bind(this.alpha),
      list: this.infrastructure.list.bind(this.infrastructure),
      upsertSkill: this.infrastructure.upsertSkill.bind(this.infrastructure),
      upsertWorkflow: this.infrastructure.upsertWorkflow.bind(this.infrastructure),
      createWorkflowRun: this.infrastructure.createWorkflowRun.bind(this.infrastructure),
      finishWorkflowRun: this.infrastructure.finishWorkflowRun.bind(this.infrastructure),
      createSkillRun: this.infrastructure.createSkillRun.bind(this.infrastructure),
      finishSkillRun: this.infrastructure.finishSkillRun.bind(this.infrastructure),
      createPlan: this.infrastructure.createPlan.bind(this.infrastructure),
      updatePlanStatus: this.infrastructure.updatePlanStatus.bind(this.infrastructure),
      listPlans: this.infrastructure.listPlans.bind(this.infrastructure),
      getPlan: this.infrastructure.getPlan.bind(this.infrastructure),
      setCache: this.infrastructure.setCache.bind(this.infrastructure),
      getCache: this.infrastructure.getCache.bind(this.infrastructure),
      upsertMcpServer: this.infrastructure.upsertMcpServer.bind(this.infrastructure),
      createMcpDiscovery: this.infrastructure.createMcpDiscovery.bind(this.infrastructure),
      updateMcpServer: this.infrastructure.updateMcpServer.bind(this.infrastructure),
      upsertMcpPermission: this.infrastructure.upsertMcpPermission.bind(this.infrastructure),
      createBrowserSession: this.infrastructure.createBrowserSession.bind(this.infrastructure),
      upsertMarketplaceItem: this.infrastructure.upsertMarketplaceItem.bind(this.infrastructure),
    });
  }

  get db() {
    return this.database.db;
  }
}