import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Wallet } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { DataTable } from "../components/DataTable.js";
import { useSession } from "../components/session.js";

export function PortfolioPage() {
  const { sessionId, setSessionId } = useSession();
  const queryClient = useQueryClient();
  const portfolio = useQuery({ queryKey: ["portfolio"], queryFn: tradingPiApi.portfolio });
  const mutation = useMutation({
    mutationFn: (value: { symbol: string; side: "buy" | "sell"; quantity: number; price: number }) =>
      tradingPiApi.createPaperOrder({ ...value, quantity: Number(value.quantity), price: Number(value.price) }, sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  const form = useForm({
    defaultValues: { symbol: "ETH/USDT", side: "buy" as "buy" | "sell", quantity: 0.1, price: 100 },
    onSubmit: async ({ value }) => mutation.mutateAsync(value),
  });
  return (
    <section className="pageStack">
      <header className="pageHeader"><h1>Portfolio</h1><p>Local paper positions, orders, and trades. Live trading is disabled.</p></header>
      <form className="controlPanel plannerGrid" onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
        <form.Field name="symbol">{(field) => <label>Symbol<input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field>
        <form.Field name="side">{(field) => <label>Side<select value={field.state.value} onChange={(event) => field.handleChange(event.target.value as "buy" | "sell")}><option value="buy">buy</option><option value="sell">sell</option></select></label>}</form.Field>
        <form.Field name="quantity">{(field) => <label>Quantity<input type="number" value={field.state.value} onChange={(event) => field.handleChange(Number(event.target.value))} /></label>}</form.Field>
        <form.Field name="price">{(field) => <label>Price<input type="number" value={field.state.value} onChange={(event) => field.handleChange(Number(event.target.value))} /></label>}</form.Field>
        <button disabled={mutation.isPending}><Wallet size={16} /> Paper Order</button>
      </form>
      <section className="tableSection"><h2>Positions</h2><DataTable data={portfolio.data?.positions ?? []} /></section>
      <section className="tableSection"><h2>Trades</h2><DataTable data={portfolio.data?.trades ?? []} /></section>
    </section>
  );
}
