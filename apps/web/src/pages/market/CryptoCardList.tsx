import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import type { MarketDetailData } from "@/components/mvp";
import { tradingPiApi } from "@/api/client";
import { cryptoTitle } from "./market-utils";
import { CryptoCard } from "./CryptoCard";
import { cryptoSymbols } from "./types";

type CryptoSpotProps = {
  favorites: string[];
  selectedId?: string;
  onSelect: (market: MarketDetailData) => void;
  onToggleFavorite: (id: string) => void;
};

export function CryptoCardList({ favorites, selectedId, onSelect, onToggleFavorite }: CryptoSpotProps) {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["crypto-spot-ohlcv"],
    queryFn: async () => {
      const rows = await Promise.all(
        cryptoSymbols.map(async (symbol) => {
          const candles = await tradingPiApi.ohlcv(symbol, "1d", 90).catch(() => []);
          return { symbol, candles: Array.isArray(candles) ? candles : [] };
        }),
      );
      return rows;
    },
  });
  const markets = useMemo(() => {
    const rows = data ?? [];
    const text = query.trim().toLowerCase();
    if (!text) return rows;
    return rows.filter((market) => {
      const title = cryptoTitle(market.symbol);
      return `${market.symbol} ${title}`.toLowerCase().includes(text);
    });
  }, [data, query]);

  return (
    <section className="min-w-0">
      <label className="relative mb-4 block max-w-xl">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full rounded-md border bg-card/70 px-9 py-2 text-sm outline-none focus:border-cyan-400/50"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search crypto spot markets..."
          value={query}
        />
      </label>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          cryptoSymbols.map((symbol) => (
            <div className="h-52 animate-pulse rounded-lg border bg-card/60" key={symbol} />
          ))
        ) : markets.length === 0 ? (
          <div className="rounded-lg border bg-card/70 p-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            No crypto markets found.
          </div>
        ) : (
          markets.map((market, index) => (
            <CryptoCard
              favorite={favorites.includes(`crypto:${market.symbol}`)}
              index={index}
              key={market.symbol}
              market={market}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
              selected={selectedId === `crypto:${market.symbol}`}
            />
          ))
        )}
      </div>
    </section>
  );
}
