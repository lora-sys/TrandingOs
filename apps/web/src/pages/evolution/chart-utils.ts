import { formatSignedMoney } from "@/lib/formatters";
import type { PnLPoint, TradeFrequencyPoint, WinRatePoint } from "@/components/mvp";
import type { EvolutionCharts, QuickStats } from "./types";

export function deriveEvolutionCharts(decisions: any[], trades: any[], workspaces: any[]): EvolutionCharts {
  const settledDecisions = decisions
    .filter((decision) => decision.status === "settled_win" || decision.status === "settled_loss")
    .sort((a, b) => Date.parse(a.updatedAt ?? a.createdAt ?? "") - Date.parse(b.updatedAt ?? b.createdAt ?? ""));
  const winRateTrend: WinRatePoint[] = settledDecisions.length
    ? settledDecisions.map((decision, index) => {
        const window = settledDecisions.slice(Math.max(0, index - 9), index + 1);
        const wins = window.filter((item) => item.status === "settled_win").length;
        return { label: shortDate(decision.updatedAt ?? decision.createdAt), winRate: Math.round((wins / window.length) * 100) };
      })
    : [{ label: "Now", winRate: 0 }];

  const closedTrades = trades
    .filter((trade) => trade.status !== "open")
    .sort((a, b) => Date.parse(a.exitTime ?? a.entryTime ?? "") - Date.parse(b.exitTime ?? b.entryTime ?? ""));
  const pnlCurve: PnLPoint[] = closedTrades.length
    ? closedTrades.reduce<PnLPoint[]>((points, trade) => {
        const previous = points.at(-1)?.cumulativePnl ?? 0;
        points.push({ label: shortDate(trade.exitTime ?? trade.entryTime), cumulativePnl: previous + Number(trade.pnl ?? 0) });
        return points;
      }, [])
    : [{ label: "Now", cumulativePnl: 0 }];

  const frequencyMap = new Map<string, TradeFrequencyPoint>();
  for (const trade of trades) {
    const label = weekLabel(trade.exitTime ?? trade.entryTime ?? trade.createdAt);
    const current = frequencyMap.get(label) ?? { label, trades: 0, netPnl: 0 };
    current.trades += 1;
    current.netPnl += Number(trade.pnl ?? 0);
    frequencyMap.set(label, current);
  }
  const tradeFrequency = Array.from(frequencyMap.values()).slice(-8);
  if (!tradeFrequency.length) tradeFrequency.push({ label: "This week", trades: 0, netPnl: 0 });

  const streak = currentStreak(settledDecisions);
  const workspaceScores = new Map<string, number>();
  for (const trade of closedTrades) {
    const workspaceId = trade.workspaceId ?? trade.workspace_id ?? "global";
    workspaceScores.set(workspaceId, (workspaceScores.get(workspaceId) ?? 0) + Number(trade.pnl ?? 0));
  }
  const [bestWorkspaceId = workspaces[0]?.id, bestWorkspacePnl = 0] = Array.from(workspaceScores.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];
  const bestWorkspace = bestWorkspaceId ? `${workspaceName(workspaces, bestWorkspaceId)} (${formatSignedMoney(bestWorkspacePnl)})` : "No workspace yet";
  const avgConfidence = averageConfidence(decisions);
  const latestWinRate = winRateTrend.at(-1)?.winRate ?? 0;
  const firstWinRate = winRateTrend[0]?.winRate ?? 0;
  const improvement = settledDecisions.length > 1 ? `${formatSignedNumber(latestWinRate - firstWinRate)} pts since first settled decision` : "Build a baseline with settled decisions";

  return {
    winRateTrend,
    pnlCurve,
    tradeFrequency,
    latestWinRate,
    totalPnl: pnlCurve.at(-1)?.cumulativePnl ?? 0,
    bestWorkspaceId: bestWorkspaceId ?? workspaces[0]?.id,
    quickStats: { streak, bestWorkspace, avgConfidence, improvement } satisfies QuickStats,
  };
}

export function currentStreak(decisions: any[]): string {
  const reversed = [...decisions].reverse();
  if (!reversed.length) return "No streak yet";
  const first = reversed[0].status;
  const count = reversed.findIndex((decision) => decision.status !== first);
  const streakCount = count === -1 ? reversed.length : count;
  return `${first === "settled_win" ? "W" : "L"}${streakCount}`;
}

export function averageConfidence(decisions: any[]): string {
  const values = decisions.map((decision) => confidenceScore(decision.confidence)).filter(Number.isFinite);
  if (!values.length) return "n/a";
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (average >= 4.7) return "A+";
  if (average >= 4.2) return "A";
  if (average >= 3.5) return "B+";
  if (average >= 3) return "B";
  if (average >= 2) return "C";
  return "D";
}

function confidenceScore(value: unknown): number {
  const text = String(value ?? "").toUpperCase();
  if (text === "A+") return 5;
  if (text === "A") return 4.5;
  if (text === "B+") return 4;
  if (text === "B") return 3.5;
  if (text === "C") return 2.5;
  if (text === "D") return 1.5;
  return Number.NaN;
}

function workspaceName(workspaces: any[], id?: string): string {
  return workspaces.find((workspace) => workspace.id === id)?.name ?? id ?? "Global";
}

function shortDate(value?: string): string {
  if (!value) return "Now";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Now" : `${date.getMonth() + 1}/${date.getDate()}`;
}

function weekLabel(value?: string): string {
  if (!value) return "This week";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "This week";
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  return `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
}

function formatSignedNumber(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

export function exportEvolution(summary: unknown, suggestions: unknown[], rules: unknown[], charts: unknown): void {
  const blob = new Blob([JSON.stringify({ summary, suggestions, rules, charts }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "trading-pi-evolution.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
