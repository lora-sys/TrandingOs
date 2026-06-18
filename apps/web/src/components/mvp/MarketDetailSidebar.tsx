import { AnimatePresence, motion } from "framer-motion";
import { BookOpenIcon, HeartIcon, NewspaperIcon, ScrollTextIcon, XIcon } from "lucide-react";
import { PriceChart, type PriceCandle } from "./PriceChart";
import { formatUsd, formatChange, formatSince } from "@/lib/formatters";

export type MarketDetailData = {
  id: string;
  type: "crypto" | "prediction";
  title: string;
  subtitle?: string;
  symbol?: string;
  price: number;
  change24h: number;
  volume?: number;
  yes?: number;
  no?: number;
  category?: string;
  settlement?: string;
  candles?: PriceCandle[];
  metrics?: {
    marketCap?: number;
    rank?: number | string;
    high?: number;
    low?: number;
    ath?: number;
  };
};

export type ActivePosition = {
  id: string;
  direction: string;
  asset: string;
  entryPrice: number;
  positionSize: number;
  entryTime: string;
};

export function MarketDetailSidebar({
  market,
  favorite,
  activePosition,
  onClose,
  onToggleFavorite,
  onResearch,
  onDecision,
  onNews,
  onClosePosition,
  busyAction,
}: {
  market: MarketDetailData | null;
  favorite?: boolean;
  activePosition?: ActivePosition | null;
  onClose: () => void;
  onToggleFavorite: () => void;
  onResearch: () => void;
  onDecision: () => void;
  onNews: () => void;
  onClosePosition?: () => void;
  busyAction?: boolean;
}) {
  return (
    <AnimatePresence>
      {market && (
        <motion.aside
          animate={{ opacity: 1, x: 0 }}
          className="fixed inset-0 z-40 overflow-auto border-l bg-background/96 p-4 backdrop-blur-xl lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:rounded-lg lg:border lg:bg-card/70"
          exit={{ opacity: 0, x: 36 }}
          initial={{ opacity: 0, x: 36 }}
          transition={{ duration: 0.18 }}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Market Detail</div>
              <h2 className="mt-1 line-clamp-2 text-xl font-semibold">{market.title}</h2>
              {market.subtitle && <p className="mt-1 text-sm text-muted-foreground">{market.subtitle}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-2xl font-semibold">{market.type === "prediction" ? `${Math.round((market.yes ?? 0.5) * 100)}% YES` : formatUsd(market.price)}</span>
                <span className={`rounded border px-2 py-1 text-xs ${market.change24h >= 0 ? "border-emerald-400/20 text-emerald-300" : "border-red-400/20 text-red-300"}`}>
                  {formatChange(market.change24h)} 24h
                </span>
                {market.category && <span className="rounded border border-white/10 px-2 py-1 text-xs text-muted-foreground">{market.category}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button aria-label={favorite ? "Remove favorite" : "Add favorite"} className={`rounded-md border p-2 ${favorite ? "border-rose-300/30 text-rose-300" : "border-white/10 text-muted-foreground"}`} onClick={onToggleFavorite} type="button">
                <HeartIcon className={`size-4 ${favorite ? "fill-current" : ""}`} />
              </button>
              <button aria-label="Close market detail" className="rounded-md border border-white/10 p-2 text-muted-foreground hover:text-foreground" onClick={onClose} type="button">
                <XIcon className="size-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <PriceChart candles={market.candles ?? []} baseValue={market.type === "prediction" ? (market.yes ?? 0.5) * 100 : market.price} mode={market.type === "prediction" ? "odds" : "price"} />
            <section className="rounded-lg border border-white/10 p-3">
              <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Quick Actions</div>
              <div className="grid grid-cols-3 gap-2">
                <ActionButton busy={busyAction} icon={BookOpenIcon} label="Research" onClick={onResearch} />
                <ActionButton busy={busyAction} icon={ScrollTextIcon} label="Decision" onClick={onDecision} />
                <ActionButton busy={busyAction} icon={NewspaperIcon} label="News" onClick={onNews} />
              </div>
            </section>
            {activePosition && (
              <PositionCard marketPrice={market.price} onClosePosition={onClosePosition} position={activePosition} />
            )}
            <OrderBook market={market} />
            <KeyMetrics market={market} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function ActionButton({ icon: Icon, label, onClick, busy }: { icon: typeof BookOpenIcon; label: string; onClick: () => void; busy?: boolean }) {
  return (
    <button className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm hover:border-cyan-400/40 disabled:opacity-50" disabled={busy} onClick={onClick} type="button">
      <Icon className="size-4 text-cyan-300" />
      {label}
    </button>
  );
}

function PositionCard({ position, marketPrice, onClosePosition }: { position: ActivePosition; marketPrice: number; onClosePosition?: () => void }) {
  const sign = position.direction === "SHORT" || position.direction === "NO" ? -1 : 1;
  const pnl = (marketPrice - position.entryPrice) * position.positionSize * sign;
  const pct = position.entryPrice ? (pnl / (position.entryPrice * position.positionSize)) * 100 : 0;
  return (
    <section className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-emerald-200">Paper Trade Position</div>
        <span className="rounded border border-emerald-400/20 px-2 py-1 text-xs text-emerald-200">OPEN · {position.direction} · {position.positionSize}U</span>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <Info label="Entry" value={formatUsd(position.entryPrice)} />
        <Info label="Now" value={formatUsd(marketPrice)} />
        <Info label="P&L" value={`${pnl >= 0 ? "+" : ""}${formatUsd(pnl)} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`} tone={pnl >= 0 ? "good" : "bad"} />
        <Info label="Entered" value={formatSince(position.entryTime)} />
      </div>
      {onClosePosition && (
        <button className="mt-3 rounded-md border border-emerald-400/30 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-400/10" onClick={onClosePosition} type="button">
          Close Position
        </button>
      )}
    </section>
  );
}

function OrderBook({ market }: { market: MarketDetailData }) {
  const mid = market.type === "prediction" ? (market.yes ?? 0.5) * 100 : market.price;
  const rows = [0, 1, 2].map((index) => {
    const step = market.type === "prediction" ? 0.8 : Math.max(mid * 0.0006, 0.01);
    return {
      bid: mid - step * (index + 1),
      ask: mid + step * (index + 1),
      bidSize: 12.5 + index * 7.6,
      askSize: 8.3 + index * 4.9,
    };
  });
  return (
    <section className="rounded-lg border border-white/10 p-3">
      <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Order Book</div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="text-emerald-300">BID</div>
        <div className="text-red-300">ASK</div>
        {rows.map((row, index) => (
          <div className="contents" key={`book-row-${index}`}>
            <div className="rounded border border-emerald-400/10 p-2" key={`bid-${index}`}>{formatBook(row.bid, market.type)} · {row.bidSize.toFixed(1)}</div>
            <div className="rounded border border-red-400/10 p-2" key={`ask-${index}`}>{formatBook(row.ask, market.type)} · {row.askSize.toFixed(1)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function KeyMetrics({ market }: { market: MarketDetailData }) {
  const high = market.metrics?.high ?? market.price * 1.04;
  const low = market.metrics?.low ?? market.price * 0.96;
  const ath = market.metrics?.ath ?? market.price * 1.18;
  return (
    <section className="rounded-lg border border-white/10 p-3">
      <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Key Metrics</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Info label={market.type === "prediction" ? "Volume" : "MCap"} value={formatUsd(market.metrics?.marketCap ?? market.volume ?? 0)} />
        <Info label="Rank" value={market.metrics?.rank ? `#${market.metrics.rank}` : market.type === "prediction" ? "P-MKT" : "n/a"} />
        <Info label="High" value={formatBook(high, market.type)} />
        <Info label="Low" value={formatBook(low, market.type)} />
        <Info label={market.type === "prediction" ? "Settles" : "ATH"} value={market.type === "prediction" ? market.settlement ?? "n/a" : formatBook(ath, market.type)} />
      </div>
    </section>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded border border-white/10 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 truncate text-sm ${tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-red-300" : ""}`}>{value}</div>
    </div>
  );
}

function formatBook(value: number, type: MarketDetailData["type"]) {
  return type === "prediction" ? `${value.toFixed(1)}%` : formatUsd(value);
}
