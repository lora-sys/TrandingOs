/**
 * Metric card component for journal dashboard stats.
 *
 * Extracted from JournalPage.tsx inline component.
 */

interface MetricProps {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}

export function Metric({ label, value, tone }: MetricProps) {
  return (
    <div className="rounded-lg border bg-card/70 p-4 backdrop-blur-xl">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-1 truncate text-xl font-semibold ${
          tone === "positive"
            ? "text-emerald-300"
            : tone === "negative"
              ? "text-red-300"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
