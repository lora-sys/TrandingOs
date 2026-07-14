export type RunStatus = "pending" | "running" | "completed" | "failed" | "blocked";
export type DecisionDirection = "YES" | "NO" | "LONG" | "SHORT" | "HOLD";
export type DecisionConfidence = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";
export type DecisionRiskLevel = "A" | "B" | "C" | "D";
export type DecisionStatus = "pending" | "executed" | "settled_win" | "settled_loss" | "invalidated" | "expired";
export type ResearchSessionStatus = "running" | "completed" | "failed" | "cancelled";
export type PaperTradeStatus = "open" | "closed" | "cancelled";

export interface MarketPriceRow {
  id: string;
  symbol: string;
  exchange: string | null;
  source: string;
  price_usd: number | null;
  change_24h: number | null;
  volume_24h: number | null;
  bid: number | null;
  ask: number | null;
  last: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  extra_json: string | null;
  fetched_at: string;
}

export interface OhlcvRow {
  id: string;
  symbol: string;
  exchange: string | null;
  timeframe: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  fetched_at: string;
}

export interface DecisionRecord {
  id: string;
  workspaceId?: string;
  topic: string;
  direction: DecisionDirection;
  positionSize: number;
  confidence: DecisionConfidence;
  riskLevel: DecisionRiskLevel;
  supportingReasons: string[];
  againstReasons: string[];
  thesis: string;
  invalidationCriteria: string;
  ruleCompliance?: unknown;
  status: DecisionStatus;
  createdAt: string;
  updatedAt: string;
  executedAt?: string;
  settledAt?: string;
  resultPnL?: number;
  reviewId?: string;
}

export interface ReviewRecord {
  id: string;
  sessionId?: string;
  workspaceId?: string;
  period: string;
  metrics: unknown;
  disciplineScore: number;
  summary: string;
  report: unknown;
  artifactId?: string;
  createdAt: string;
}

export interface EvolutionSuggestionRecord {
  id: string;
  workspaceId?: string;
  reviewId?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  ruleText?: string;
  source: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  description?: string;
  kind: string;
  topicType?: string;
  topicRef?: string;
  creatorSessionId?: string;
  isDefault: boolean;
  context: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchSessionRecord {
  id: string;
  workspaceId?: string;
  topic: string;
  mode: "builtin";
  status: ResearchSessionStatus;
  totalIterations: number;
  completedIterations: number;
  reportArtifactId?: string;
  tokenUsage: unknown;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface PaperTradeRecord {
  id: string;
  decisionId: string;
  workspaceId: string;
  direction: string;
  asset: string;
  entryPrice: number;
  exitPrice?: number;
  positionSize: number;
  pnl?: number;
  pnlPercent?: number;
  entryTime: string;
  exitTime?: string;
  status: PaperTradeStatus;
  settlementReason?: string;
  journalEntryId?: string;
  stopLoss?: number;
  takeProfit?: number;
  amendedAt?: string;
  realizedPnl: number;
}