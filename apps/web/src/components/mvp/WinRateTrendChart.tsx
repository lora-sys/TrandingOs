import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type WinRatePoint = {
  label: string;
  winRate: number;
};

const axisStyle = { fill: "rgba(255,255,255,0.6)", fontSize: 11 };
const tooltipStyle = {
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(12px)",
};

export function WinRateTrendChart({ data }: { data: WinRatePoint[] }) {
  return (
    <ChartShell title="Win Rate Trend" subtitle="Rolling 10-decision rate">
      <ResponsiveContainer height={230} width="100%">
        <LineChart data={data} margin={{ bottom: 8, left: -18, right: 14, top: 12 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="rgba(255,255,255,0.18)" tick={axisStyle} tickLine={false} />
          <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.18)" tick={axisStyle} tickFormatter={(value) => `${value}%`} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(0)}%`, "Win rate"]} labelStyle={{ color: "rgba(255,255,255,0.7)" }} />
          <Line activeDot={{ r: 5, stroke: "#0f172a", strokeWidth: 2 }} dataKey="winRate" dot={{ r: 3, fill: "#06b6d4" }} stroke="#06b6d4" strokeWidth={2.5} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function ChartShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card/50 p-4 backdrop-blur-xl">
      <div className="mb-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      {children}
    </section>
  );
}
