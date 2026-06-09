import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { BrainCircuit, Play } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { useSession } from "../components/session.js";

export function ResearchPage() {
  const { sessionId, setSessionId } = useSession();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (value: { symbol: string; exchange: string }) =>
      tradingPiApi.runWorkflow("research.asset", { symbol: value.symbol, exchange: value.exchange || undefined }, sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  const form = useForm({
    defaultValues: { symbol: "ETH", exchange: "binance" },
    onSubmit: async ({ value }) => mutation.mutateAsync(value),
  });
  return (
    <section className="pageStack">
      <header className="pageHeader"><h1>Research</h1><p>AI research reports grounded in observed market context.</p></header>
      <form className="controlPanel" onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
        <form.Field name="symbol">{(field) => <label>Asset<input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field>
        <form.Field name="exchange">{(field) => <label>Exchange<input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field>
        <button disabled={mutation.isPending}><Play size={16} /> Run Research</button>
      </form>
      {mutation.data && <article className="skillRunCard"><BrainCircuit size={18} /><div><strong>Research workflow completed</strong><p>Research Report artifact generated through AI and Skills.</p></div></article>}
    </section>
  );
}
