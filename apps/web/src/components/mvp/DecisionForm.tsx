import { useState } from "react";

export type DecisionFormValue = {
  topic: string;
  direction: string;
  positionSize: number;
  confidence: string;
  riskLevel: string;
  thesis: string;
  supportingReasons: string[];
  againstReasons: string[];
  invalidationCriteria: string;
};

export function DecisionForm({ topic, onSubmit, busy }: { topic: string; onSubmit: (value: DecisionFormValue) => void; busy?: boolean }) {
  const [value, setValue] = useState({
    topic,
    direction: "YES",
    positionSize: 1,
    confidence: "B",
    riskLevel: "B",
    thesis: "",
    supportingReasons: "Manual workspace decision.",
    againstReasons: "Needs follow-up validation.",
    invalidationCriteria: "Evidence invalidates the thesis.",
  });
  const valid = value.topic.trim() && value.thesis.trim() && value.invalidationCriteria.trim() && value.positionSize >= 0;
  return (
    <form className="space-y-3" onSubmit={(event) => {
      event.preventDefault();
      if (!valid) return;
      onSubmit({
        ...value,
        supportingReasons: lines(value.supportingReasons),
        againstReasons: lines(value.againstReasons),
      });
    }}>
      <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setValue({ ...value, topic: event.target.value })} placeholder="Topic" value={value.topic} />
      <div className="grid gap-2 sm:grid-cols-4">
        <select className="rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setValue({ ...value, direction: event.target.value })} value={value.direction}>{["YES", "NO", "LONG", "SHORT", "HOLD"].map((item) => <option key={item}>{item}</option>)}</select>
        <input className="rounded-md border bg-background px-3 py-2 text-sm" min="0" onChange={(event) => setValue({ ...value, positionSize: Number(event.target.value) })} type="number" value={value.positionSize} />
        <select className="rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setValue({ ...value, confidence: event.target.value })} value={value.confidence}>{["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"].map((item) => <option key={item}>{item}</option>)}</select>
        <select className="rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setValue({ ...value, riskLevel: event.target.value })} value={value.riskLevel}>{["A", "B", "C", "D"].map((item) => <option key={item}>{item}</option>)}</select>
      </div>
      <textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setValue({ ...value, thesis: event.target.value })} placeholder="Thesis" value={value.thesis} />
      <textarea className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setValue({ ...value, supportingReasons: event.target.value })} placeholder="Supporting reasons, one per line" value={value.supportingReasons} />
      <textarea className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setValue({ ...value, againstReasons: event.target.value })} placeholder="Against reasons, one per line" value={value.againstReasons} />
      <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setValue({ ...value, invalidationCriteria: event.target.value })} placeholder="Invalidation criteria" value={value.invalidationCriteria} />
      <button className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black disabled:opacity-50" disabled={!valid || busy} type="submit">Save Decision</button>
    </form>
  );
}

function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}
