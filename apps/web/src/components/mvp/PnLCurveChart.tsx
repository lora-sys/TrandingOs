import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PnLPoint = {
  label: string;
  cumulativePnl: number;
};

const axisStyle = { fill: "rgba(255,255,255,0.6)", fontSize: 11 };
const tooltipStyle = {
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(12px)",
};

export function PnLCurveChart({ data }: { data: PnLPoint[] }) {
  const last = data.at(-1)?.cumulativePnl ?? 0;
  const stroke = last >= 0 ? "#34d399" : "#f87171";
  const gradientId = last >= 0 ? "pnlPositiveGradient" : "pnlNegativeGradient";

  return (
    <section className="rounded-lg border bg-card/50 p-4 backdrop-blur-xl">
      <div className="mb-2">
        <div className="text-sm font-medium">P&L Curve</div>
        <div className="text-xs text-muted-foreground">Cumulative settled result</div>
      </div>
      <ResponsiveContainer height={230} width="100%">
        <AreaChart data={data} margin={{ bottom: 8, left: -18, right: 14, top: 12 }}>
          <defs>
            <linearGradient id="pnlPositiveGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.38} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="pnlNegativeGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.36} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="rgba(255,255,255,0.18)" tick={axisStyle} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.18)" tick={axisStyle} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`$${Number(value).toFixed(2)}`, "Cumulative P&L"]} labelStyle={{ color: "rgba(255,255,255,0.7)" }} />
          <Area dataKey="cumulativePnl" fill={`url(#${gradientId})`} stroke={stroke} strokeWidth={2.5} type="monotone" />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
