import { motion } from "framer-motion";
import { ActivityIcon, HeartIcon } from "lucide-react";
import type { MarketDetailData } from "@/components/mvp";
import { formatChange, formatUsd } from "@/lib/formatters";
import { syntheticOddsCandles, toPredictionDetail } from "./market-utils";
import { Sparkline } from "./MarketSparkline";
import { Info, Outcome } from "./MarketUI";
import type { NormalizedMarket } from "./types";

type PredictionCardProps = {
  market: NormalizedMarket;
  index: number;
  favorite: boolean;
  selected: boolean;
  onSelect: (market: MarketDetailData) => void;
  onToggleFavorite: (id: string) => void;
};

export function PredictionCard({ market, index, favorite, selected, onSelect, onToggleFavorite }: PredictionCardProps) {
  const id = `prediction:${market.id}`;
  return (
    <motion.article
      className={`rounded-lg border bg-card/70 p-4 backdrop-blur-xl transition-colors ${selected ? "border-cyan-400/50" : "hover:border-cyan-400/35"}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <button className="min-w-0 flex-1 text-left" onClick={() => onSelect(toPredictionDetail(market))} type="button">
          <h2 className="line-clamp-3 text-sm font-medium leading-5">{market.title}</h2>
        </button>
        <button
          aria-label={favorite ? "Remove favorite" : "Add favorite"}
          className={`rounded-md border p-1.5 ${favorite ? "border-rose-300/30 text-rose-300" : "border-white/10 text-muted-foreground"}`}
          onClick={() => onToggleFavorite(id)}
          type="button"
        >
          <HeartIcon className={`size-4 ${favorite ? "fill-current" : ""}`} />
        </button>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Outcome label="YES" value={market.yes} tone="yes" />
        <Outcome label="NO" value={market.no} tone="no" />
      </div>
      <Sparkline candles={syntheticOddsCandles(market.yes * 100, 18)} fallback={market.yes * 100} mode="odds" />
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Info label="Volume" value={formatUsd(market.volume)} />
        <Info label="24h" value={formatChange(market.change24h)} />
        <Info label="Settles" value={market.settlement} />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <ActivityIcon className="size-3.5" />
        {market.category || "Prediction"}
      </div>
    </motion.article>
  );
}
