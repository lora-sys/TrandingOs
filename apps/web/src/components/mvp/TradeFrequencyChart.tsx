import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TradeFrequencyPoint = {
  label: string;
  trades: number;
  netPnl: number;
};

const axisStyle = { fill: "rgba(255,255,255,0.6)", fontSize: 11 };
const tooltipStyle = {
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(12px)",
};

export function TradeFrequencyChart({ data }: { data: TradeFrequencyPoint[] }) {
  return (
    <section className="rounded-lg border bg-card/50 p-4 backdrop-blur-xl">
      <div className="mb-2">
        <div className="text-sm font-medium">Trade Frequency</div>
        <div className="text-xs text-muted-foreground">Trades per week colored by net result</div>
      </div>
      <ResponsiveContainer height={230} width="100%">
        <BarChart data={data} margin={{ bottom: 8, left: -18, right: 14, top: 12 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="rgba(255,255,255,0.18)" tick={axisStyle} tickLine={false} />
          <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.18)" tick={axisStyle} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [name === "netPnl" ? `$${Number(value).toFixed(2)}` : value, name === "netPnl" ? "Net P&L" : "Trades"]} labelStyle={{ color: "rgba(255,255,255,0.7)" }} />
          <Bar dataKey="trades" radius={[5, 5, 0, 0]}>
            {data.map((point) => (
              <Cell fill={point.netPnl >= 0 ? "#34d399" : "#f87171"} key={point.label} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
