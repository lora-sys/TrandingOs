import type { PnLPoint, TradeFrequencyPoint, WinRatePoint } from "@/components/mvp";

export type QuickStats = {
  streak: string;
  bestWorkspace: string;
  avgConfidence: string;
  improvement: string;
};

export type EvolutionCharts = {
  winRateTrend: WinRatePoint[];
  pnlCurve: PnLPoint[];
  tradeFrequency: TradeFrequencyPoint[];
  latestWinRate: number;
  totalPnl: number;
  bestWorkspaceId: string | undefined;
  quickStats: QuickStats;
};
