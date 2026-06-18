import type { PriceCandle } from "@/components/mvp";
import { normalizeSparkline } from "./market-utils";

export function Sparkline({
  candles,
  fallback,
  mode = "price",
}: {
  candles: PriceCandle[];
  fallback: number;
  mode?: "price" | "odds";
}) {
  const points = normalizeSparkline(candles, fallback);
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const last = points.at(-1)?.value ?? fallback;
  const first = points[0]?.value ?? fallback;
  const up = last >= first;
  return (
    <svg aria-label={`${mode} sparkline`} className="mt-4 h-14 w-full overflow-visible" role="img" viewBox="0 0 120 44">
      <path d={path} fill="none" stroke={up ? "#22d3ee" : "#fb7185"} strokeLinecap="round" strokeWidth="2" />
      <path
        d={`${path} L 120 44 L 0 44 Z`}
        fill={up ? "rgba(34, 211, 238, 0.08)" : "rgba(251, 113, 133, 0.08)"}
      />
    </svg>
  );
}
