import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { LineChart, Play } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { useSession } from "../components/session.js";

export function MarketPage() {
  const { sessionId, setSessionId } = useSession();
  const queryClient = useQueryClient();
  const artifacts = useQuery({ queryKey: ["artifacts"], queryFn: tradingPiApi.artifacts });
  const mutation = useMutation({
    mutationFn: (value: { symbol: string; exchange: string }) =>
      tradingPiApi.runWorkflow("market.snapshot", { symbol: value.symbol, exchange: value.exchange || undefined }, sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  const form = useForm({
    defaultValues: { symbol: "ETH/USDT", exchange: "binance" },
    onSubmit: async ({ value }) => mutation.mutateAsync(value),
  });
  return (
    <section className="pageStack">
      <PageHeader title="Market" subtitle="Dual-source market data with explicit source failures." />
      <form className="controlPanel" onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
        <form.Field name="symbol">{(field) => <label>Symbol<input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field>
        <form.Field name="exchange">{(field) => <label>Exchange<input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field>
        <button disabled={mutation.isPending}><Play size={16} /> Snapshot</button>
      </form>
      <section className="artifactGrid">
        {(artifacts.data ?? []).filter((artifact: any) => artifact.type === "market-snapshot").slice(0, 6).map((artifact: any) => (
          <article className="artifactCard" key={artifact.id}><LineChart size={18} /><div><strong>{artifact.title}</strong><p>{artifact.summary}</p><small>{artifact.created_at}</small></div></article>
        ))}
      </section>
    </section>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="pageHeader"><h1>{title}</h1><p>{subtitle}</p></header>;
}
