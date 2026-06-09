import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { NotebookPen } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { DataTable } from "../components/DataTable.js";
import { useSession } from "../components/session.js";

export function JournalPage() {
  const { sessionId, setSessionId } = useSession();
  const queryClient = useQueryClient();
  const journal = useQuery({ queryKey: ["journal"], queryFn: tradingPiApi.journal });
  const mutation = useMutation({
    mutationFn: (value: { tradeId: string; mood: string; disciplineScore: number; rulesViolated: string; notes: string }) =>
      tradingPiApi.createJournal(
        { ...value, tradeId: value.tradeId || undefined, disciplineScore: Number(value.disciplineScore), rulesViolated: splitTags(value.rulesViolated) },
        sessionId,
      ),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  const form = useForm({
    defaultValues: { tradeId: "", mood: "focused", disciplineScore: 80, rulesViolated: "", notes: "Followed plan; waiting for review." },
    onSubmit: async ({ value }) => mutation.mutateAsync(value),
  });
  return (
    <section className="pageStack">
      <header className="pageHeader"><h1>Journal</h1><p>Record execution, emotion, rule breaks, and artifact references.</p></header>
      <form className="controlPanel journalForm" onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
        <form.Field name="tradeId">{(field) => <label>Trade ID<input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field>
        <form.Field name="mood">{(field) => <label>Mood<input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field>
        <form.Field name="disciplineScore">{(field) => <label>Discipline<input type="number" value={field.state.value} onChange={(event) => field.handleChange(Number(event.target.value))} /></label>}</form.Field>
        <form.Field name="rulesViolated">{(field) => <label>Rule Tags<input value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field>
        <form.Field name="notes">{(field) => <label className="wide">Notes<textarea value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} /></label>}</form.Field>
        <button disabled={mutation.isPending}><NotebookPen size={16} /> Save Journal</button>
      </form>
      <section className="tableSection"><h2>Entries</h2><DataTable data={journal.data ?? []} /></section>
    </section>
  );
}

function splitTags(input: string) {
  return input.split(",").map((item) => item.trim()).filter(Boolean);
}
