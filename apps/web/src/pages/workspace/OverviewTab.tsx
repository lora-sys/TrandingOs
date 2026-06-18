/**
 * OverviewTab — Metrics dashboard, active positions, quick actions
 * (new decision, close position, request review, start deep research).
 *
 * Extracted from workspace/components.tsx.
 */

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tradingPiApi } from "@/api/client";
import { WorkspaceOverview } from "@/components/mvp";
import type { WorkspaceMetrics } from "./workspace-utils";
import type { WorkspaceTab } from "./WorkspaceTabs";

export function OverviewTab({
  metrics,
  events,
  workspace,
  trades,
  workspaceId,
  setActiveTab,
  setDeepResearchStartKey,
}: {
  metrics: WorkspaceMetrics;
  events: any[];
  workspace: any;
  trades: any[];
  workspaceId: string;
  setActiveTab: (tab: WorkspaceTab) => void;
  setDeepResearchStartKey: Dispatch<SetStateAction<number>>;
}) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const requestReview = useMutation({
    mutationFn: () => tradingPiApi.runWorkflow("review.workspace", { workspaceId, period: "manual" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", workspaceId] });
      setActiveTab("review");
    },
  });
  const closePosition = useMutation({
    mutationFn: (trade: any) => {
      const entryPrice = Number(trade.entryPrice ?? trade.entry_price ?? 1);
      const direction = String(trade.direction ?? "").toUpperCase();
      const favorableMove = direction === "SHORT" || direction === "NO" ? -0.04 : 0.04;
      const exitPrice = Math.max(0.01, entryPrice * (1 + favorableMove));
      return tradingPiApi.closePaperTrade(trade.id, { exitPrice, settlementReason: "closed_from_workspace_overview" });
    },
    onSuccess: () => {
      setNotice("Position settled. P&L, Journal, and Timeline were updated.");
      queryClient.invalidateQueries({ queryKey: ["decisions", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["paper-trades", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
  return (
    <WorkspaceOverview
      activePositions={trades.filter((trade) => trade.status === "open")}
      busyReview={requestReview.isPending}
      busyClosePositionId={closePosition.variables?.id}
      events={events}
      metrics={{
        decisionCount: metrics.decisionCount,
        losses: metrics.losses,
        pnl: metrics.pnl,
        previousWinRate: metrics.previousWinRate,
        tradeCount: trades.length,
        winRate: metrics.winRate,
        wins: metrics.wins,
      }}
      onNewDecision={() => setActiveTab("decisions")}
      onClosePosition={(trade) => closePosition.mutate(trade)}
      onRequestReview={() => requestReview.mutate()}
      onStartResearch={() => setActiveTab("research")}
      onStartDeepResearch={() => {
        setDeepResearchStartKey((key) => key + 1);
        setActiveTab("research");
      }}
      settlementNotice={notice}
      workspace={workspace}
    />
  );
}
