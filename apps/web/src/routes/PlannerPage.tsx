import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { ClipboardList, Play } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { useSession } from "../components/session.js";

export function PlannerPage() {
  const { sessionId, setSessionId } = useSession();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (value: { symbol: string; budgetUsd: number; direction: string; entry: number; stop: number; takeProfit: number }) =>
      tradingPiApi.runWorkflow(
        "trade.plan",
        {
          symbol: value.symbol,
          budgetUsd: Number(value.budgetUsd),
          direction: value.direction,
          entry: Number(value.entry) || undefined,
          stop: Number(value.stop) || undefined,
          takeProfit: Number(value.takeProfit) || undefined,
        },
        sessionId,
      ),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  const form = useForm({
    defaultValues: { symbol: "ETH/USDT", budgetUsd: 100, direction: "spot", entry: 0, stop: 0, takeProfit: 0 },
    onSubmit: async ({ value }) => mutation.mutateAsync(value),
  });
  return (
    <section className="pageStack">
      <header className="pageHeader"><h1>Trade Planner</h1><p>Plan first, size risk, generate artifacts, then require approval for danger.</p></header>
      <form className="controlPanel plannerGrid" onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
        <form.Field name="symbol">{(field) => <label>Symbol<input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field>
        <form.Field name="budgetUsd">{(field) => <label>Budget USD<input type="number" value={field.state.value} onChange={(event) => field.handleChange(Number(event.target.value))} /></label>}</form.Field>
        <form.Field name="direction">{(field) => <label>Direction<input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field>
        <form.Field name="entry">{(field) => <label>Entry<input type="number" value={field.state.value} onChange={(event) => field.handleChange(Number(event.target.value))} /></label>}</form.Field>
        <form.Field name="stop">{(field) => <label>Stop<input type="number" value={field.state.value} onChange={(event) => field.handleChange(Number(event.target.value))} /></label>}</form.Field>
        <form.Field name="takeProfit">{(field) => <label>Take Profit<input type="number" value={field.state.value} onChange={(event) => field.handleChange(Number(event.target.value))} /></label>}</form.Field>
        <button disabled={mutation.isPending}><Play size={16} /> Generate Plan</button>
      </form>
      {mutation.data && <article className="skillRunCard"><ClipboardList size={18} /><div><strong>Trade Plan created</strong><p>Trade Plan and Risk Report artifacts generated.</p></div></article>}
    </section>
  );
}
