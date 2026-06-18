import { useEffect, useMemo, useRef, useState } from "react";
import { CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, createChart } from "lightweight-charts";

export type PriceCandle = {
  timestamp?: number | string;
  time?: number | string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
};

type Range = "7D" | "30D" | "90D";

export function PriceChart({
  candles,
  baseValue = 100,
  mode = "price",
}: {
  candles: PriceCandle[];
  baseValue?: number;
  mode?: "price" | "odds";
}) {
  const [range, setRange] = useState<Range>("30D");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartData = useMemo(() => normalizeCandles(candles, baseValue, range), [baseValue, candles, range]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height: 280,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "rgba(11, 18, 32, 0)" },
        textColor: "#9ca3af",
        fontSize: 11,
      },
      grid: {
        horzLines: { color: "rgba(255,255,255,0.06)" },
        vertLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(34, 211, 238, 0.35)", labelBackgroundColor: "#0e7490" },
        horzLine: { color: "rgba(34, 211, 238, 0.35)", labelBackgroundColor: "#0e7490" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.1, bottom: 0.24 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22d3ee",
      downColor: "#fb7185",
      borderUpColor: "#67e8f9",
      borderDownColor: "#f43f5e",
      wickUpColor: "#67e8f9",
      wickDownColor: "#f43f5e",
      priceFormat: mode === "odds" ? { type: "price", precision: 1, minMove: 0.1 } : { type: "price", precision: 2, minMove: 0.01 },
    });
    candleSeries.setData(chartData.candles as never);
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(34, 211, 238, 0.26)",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volumeSeries.setData(chartData.volume as never);
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [chartData, mode]);

  return (
    <div className="rounded-lg border border-white/10 bg-black/10 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{mode === "odds" ? "Odds Chart" : "Price Chart"}</div>
          <div className="text-[11px] text-muted-foreground">Crosshair, wheel zoom, and drag pan enabled</div>
        </div>
        <div className="inline-flex rounded-md border border-white/10 bg-background/60 p-1">
          {(["7D", "30D", "90D"] as const).map((item) => (
            <button
              className={`rounded px-2 py-1 text-xs ${range === item ? "bg-cyan-400 text-black" : "text-muted-foreground hover:text-foreground"}`}
              key={item}
              onClick={() => setRange(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="h-[280px] min-w-0" />
    </div>
  );
}

function normalizeCandles(candles: PriceCandle[], baseValue: number, range: Range) {
  const limit = range === "7D" ? 7 : range === "30D" ? 30 : 90;
  const source = candles.length ? candles : syntheticCandles(baseValue, limit);
  const sliced = source.slice(0, limit).reverse();
  const normalized = sliced.map((candle, index) => {
    const close = finite(candle.close, baseValue);
    const open = finite(candle.open, close * (1 + Math.sin(index) * 0.01));
    const high = finite(candle.high, Math.max(open, close) * 1.012);
    const low = finite(candle.low, Math.min(open, close) * 0.988);
    return {
      time: normalizeTime(candle.timestamp ?? candle.time, index, sliced.length),
      open,
      high,
      low,
      close,
      volume: Math.max(1, finite(candle.volume, Math.abs(close - open) * 1000 + 100)),
      up: close >= open,
    };
  });
  return {
    candles: normalized.map(({ volume: _volume, up: _up, ...candle }) => candle),
    volume: normalized.map((candle) => ({
      time: candle.time,
      value: candle.volume,
      color: candle.up ? "rgba(34, 211, 238, 0.32)" : "rgba(251, 113, 133, 0.32)",
    })),
  };
}

function syntheticCandles(baseValue: number, count: number): PriceCandle[] {
  return Array.from({ length: count }).map((_, index) => {
    const wave = Math.sin(index / 2.8) * 0.035 + Math.cos(index / 5) * 0.018;
    const close = baseValue * (1 + wave);
    const open = close * (1 - Math.sin(index) * 0.012);
    return {
      timestamp: Date.now() - index * 86_400_000,
      open,
      high: Math.max(open, close) * 1.014,
      low: Math.min(open, close) * 0.986,
      close,
      volume: 1000 + index * 38,
    };
  });
}

function normalizeTime(value: unknown, index: number, total: number) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : NaN;
  const ms = Number.isFinite(numeric) ? (numeric < 10_000_000_000 ? numeric * 1000 : numeric) : Date.now() - (total - index) * 86_400_000;
  return Math.floor(ms / 1000);
}

function finite(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}
