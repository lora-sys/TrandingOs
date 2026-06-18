import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MarketDetailData } from "@/components/mvp";
import { MarketDetailSidebar } from "@/components/mvp";
import { tradingPiApi } from "@/api/client";
import { findActivePosition } from "./market-utils";
import { usePersistentFavorites } from "./market-hooks";
import { TabButton } from "./MarketUI";
import { CryptoCardList } from "./CryptoCardList";
import { PredictionCardList } from "./PredictionCardList";

export function MarketPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"crypto" | "prediction">("crypto");
  const [selected, setSelected] = useState<MarketDetailData | null>(null);
  const [favorites, setFavorites] = usePersistentFavorites();
  const [notice, setNotice] = useState("");
  const { data: paperTradeData } = useQuery({
    queryKey: ["paper-trades"],
    queryFn: () => tradingPiApi.paperTrades().catch(() => []),
  });
  const paperTrades = Array.isArray(paperTradeData) ? paperTradeData : [];

  const closeTrade = useMutation({
    mutationFn: (input: { id: string; price: number }) =>
      tradingPiApi.closePaperTrade(input.id, {
        exitPrice: input.price,
        settlementReason: "closed_from_market_detail",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["paper-trades"] }),
  });

  const createWorkspace = useMutation({
    mutationFn: (input: { action: "research" | "decision"; market: MarketDetailData }) =>
      tradingPiApi.createWorkspace({
        name: input.market.title.slice(0, 90),
        topicType: input.market.type === "prediction" ? "polymarket" : "crypto",
        topicRef: input.market.symbol ?? input.market.id,
        description: `${input.action === "research" ? "Research" : "Decision"} workspace created from Markets detail.`,
        context: { source: "markets", action: input.action, market: input.market },
      }),
    onSuccess: (result: any, input) => {
      const id = result.workspace?.id ?? result.id;
      if (id) {
        const params = new URLSearchParams({ topic: input.market.title });
        params.set("tab", input.action === "decision" ? "decisions" : "research");
        window.location.href = `/workspace/${encodeURIComponent(id)}?${params.toString()}`;
      }
    },
  });

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(next);
  };

  const activePosition = selected ? findActivePosition(paperTrades, selected) : null;

  const runNewsScan = async () => {
    if (!selected) return;
    setNotice("News scan running...");
    try {
      await tradingPiApi.runResearch({
        symbol: selected.symbol ?? selected.title,
        question: `Latest news and market catalysts for ${selected.title}`,
      });
      setNotice(`News research completed for ${selected.title}.`);
    } catch (error: any) {
      setNotice(`News research could not complete: ${error?.message ?? "unknown error"}`);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1500px] p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Markets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Crypto spot context and prediction markets in one work surface.</p>
        </div>
        <div className="inline-flex rounded-md border bg-card/70 p-1">
          <TabButton active={tab === "crypto"} onClick={() => setTab("crypto")}>
            Crypto Spot
          </TabButton>
          <TabButton active={tab === "prediction"} onClick={() => setTab("prediction")}>
            Prediction Markets
          </TabButton>
        </div>
      </div>
      {notice && (
        <div className="mb-4 rounded-md border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">{notice}</div>
      )}

      <div
        className={`grid gap-4 ${
          selected ? "lg:grid-cols-[minmax(0,3fr)_minmax(380px,2fr)]" : "lg:grid-cols-1"
        }`}
      >
        {tab === "crypto" ? (
          <CryptoCardList
            favorites={favorites}
            onSelect={setSelected}
            onToggleFavorite={toggleFavorite}
            selectedId={selected?.id}
          />
        ) : (
          <PredictionCardList
            favorites={favorites}
            onSelect={setSelected}
            onToggleFavorite={toggleFavorite}
            selectedId={selected?.id}
          />
        )}
        <MarketDetailSidebar
          activePosition={activePosition}
          busyAction={createWorkspace.isPending || closeTrade.isPending}
          favorite={selected ? favorites.includes(selected.id) : false}
          market={selected}
          onClose={() => setSelected(null)}
          onClosePosition={
            activePosition
              ? () =>
                  closeTrade.mutate({
                    id: activePosition.id,
                    price: selected?.price ?? activePosition.entryPrice,
                  })
              : undefined
          }
          onDecision={() => selected && createWorkspace.mutate({ action: "decision", market: selected })}
          onNews={runNewsScan}
          onResearch={() => selected && createWorkspace.mutate({ action: "research", market: selected })}
          onToggleFavorite={() => selected && toggleFavorite(selected.id)}
        />
      </div>
    </main>
  );
}
