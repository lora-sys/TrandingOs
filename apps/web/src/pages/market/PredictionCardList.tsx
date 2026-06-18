import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import type { MarketDetailData } from "@/components/mvp";
import { tradingPiApi } from "@/api/client";
import { normalizeMarkets, syntheticOddsCandles } from "./market-utils";
import { PredictionCard } from "./PredictionCard";
import { predictionCategories } from "./types";

type PredictionMarketsProps = {
  favorites: string[];
  selectedId?: string;
  onSelect: (market: MarketDetailData) => void;
  onToggleFavorite: (id: string) => void;
};

export function PredictionCardList({ favorites, selectedId, onSelect, onToggleFavorite }: PredictionMarketsProps) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["polymarket", category, debouncedQuery],
    queryFn: () =>
      tradingPiApi
        .markets({
          source: "polymarket",
          q: debouncedQuery || undefined,
          category: category === "All" ? undefined : category,
          limit: 50,
        })
        .catch((error: Error) => ({ markets: [], error: error.message })),
  });

  const markets = useMemo(() => {
    const normalized = normalizeMarkets(data);
    const categoryFiltered =
      category === "All"
        ? normalized
        : normalized.filter((market) => String(market.category ?? "").toLowerCase() === category.toLowerCase());
    if (!debouncedQuery) return categoryFiltered;
    const text = debouncedQuery.toLowerCase();
    return categoryFiltered.filter((market) =>
      `${market.title} ${market.category ?? ""}`.toLowerCase().includes(text),
    );
  }, [category, data, debouncedQuery]);

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative block min-w-64 flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border bg-card/70 px-9 py-2 text-sm outline-none focus:border-cyan-400/50"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search prediction markets..."
            value={query}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {predictionCategories.map((item) => (
            <button
              className={`rounded-md border px-3 py-2 text-sm ${category === item ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "bg-card/70 text-muted-foreground hover:text-foreground"}`}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {data?.error && (
        <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">
          {data.error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div className="h-60 animate-pulse rounded-lg border bg-card/60" key={index} />
          ))
        ) : markets.length === 0 ? (
          <div className="rounded-lg border bg-card/70 p-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            No prediction markets found.
          </div>
        ) : (
          markets.map((market, index) => (
            <PredictionCard
              favorite={favorites.includes(`prediction:${market.id}`)}
              index={index}
              key={market.id}
              market={market}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
              selected={selectedId === `prediction:${market.id}`}
            />
          ))
        )}
      </div>
    </section>
  );
}
