import { motion } from "framer-motion";
import { BitcoinIcon, HeartIcon } from "lucide-react";
import type { MarketDetailData } from "@/components/mvp";
import { formatChange, formatUsd } from "@/lib/formatters";
import { fallbackPrice, cryptoTitle, toCryptoDetail } from "./market-utils";
import { Sparkline } from "./MarketSparkline";
import { Info } from "./MarketUI";

type CryptoCardProps = {
  market: { symbol: string; candles: any[] };
  index: number;
  favorite: boolean;
  selected: boolean;
  onSelect: (market: MarketDetailData) => void;
  onToggleFavorite: (id: string) => void;
};

export function CryptoCard({ market, index, favorite, selected, onSelect, onToggleFavorite }: CryptoCardProps) {
  const latest = market.candles[0] ?? market.candles.at?.(-1) ?? {};
  const previous = market.candles[1] ?? {};
  const price = Number(latest.close ?? latest.price_usd ?? latest.last ?? 0) || fallbackPrice(market.symbol);
  const prev = Number(previous.close ?? price);
  const change = prev ? ((price - prev) / prev) * 100 : 0;
  const id = `crypto:${market.symbol}`;
  const title = cryptoTitle(market.symbol);

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border bg-card/70 p-4 text-left backdrop-blur-xl transition-colors ${selected ? "border-cyan-400/50" : "hover:border-cyan-400/35"}`}
      initial={{ opacity: 0, y: 8 }}
      transition={{ delay: index * 0.04 }}
    >
      <button className="block w-full text-left" onClick={() => onSelect(toCryptoDetail(market, price, change, title))} type="button">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <BitcoinIcon className="size-4 text-amber-300" />
              {market.symbol}
            </div>
            <div className="mt-2 text-2xl font-semibold">{formatUsd(price)}</div>
          </div>
          <span
            className={`rounded border px-2 py-1 text-xs ${change >= 0 ? "border-emerald-400/20 text-emerald-300" : "border-red-400/20 text-red-300"}`}
          >
            {formatChange(change)}
          </span>
        </div>
        <Sparkline candles={market.candles} fallback={price} />
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <Info label="Volume" value={formatUsd(Number(latest.volume ?? 0))} />
          <Info label="Source" value="OHLCV" />
        </div>
      </button>
      <button
        aria-label={favorite ? "Remove favorite" : "Add favorite"}
        className={`mt-3 rounded-md border p-1.5 ${favorite ? "border-rose-300/30 text-rose-300" : "border-white/10 text-muted-foreground"}`}
        onClick={() => onToggleFavorite(id)}
        type="button"
      >
        <HeartIcon className={`size-4 ${favorite ? "fill-current" : ""}`} />
      </button>
    </motion.article>
  );
}
