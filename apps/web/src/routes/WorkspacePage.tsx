import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { FolderKanban, Plus } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { DataTable } from "../components/DataTable.js";
import { useSession } from "../components/session.js";

export function WorkspacePage() {
  const { sessionId, setSessionId } = useSession();
  const queryClient = useQueryClient();
  const workspaces = useQuery({ queryKey: ["workspaces"], queryFn: tradingPiApi.workspaces });
  const mutation = useMutation({
    mutationFn: (value: { name: string; kind: string; symbol: string }) =>
      tradingPiApi.createWorkspace({ name: value.name, kind: value.kind, context: { symbol: value.symbol } }, sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  const bootstrap = useMutation({
    mutationFn: () => tradingPiApi.runWorkflow("os.bootstrap", {}, sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  const form = useForm({
    defaultValues: { name: "ETH Workspace", kind: "eth", symbol: "ETH/USDT" },
    onSubmit: async ({ value }) => mutation.mutateAsync(value),
  });
  return (
    <section className="pageStack">
      <header className="pageHeader"><h1>Workspaces</h1><p>Context + Memory + Artifacts + Workflows for BTC, ETH, Macro, and custom domains.</p></header>
      <Card className="controlPanel heroPanel">
        <Card.Header className="panelTitle"><FolderKanban size={16} /> Workspace Manager <Chip size="sm" variant="solid">OS domain</Chip></Card.Header>
        <form className="workspaceForm" onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
          <form.Field name="name">{(field) => <input aria-label="Workspace name" placeholder="Name" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />}</form.Field>
          <form.Field name="kind">{(field) => <label>Kind<select value={field.state.value} onChange={(event) => field.handleChange(event.target.value)}><option value="btc">BTC</option><option value="eth">ETH</option><option value="macro">Macro</option><option value="custom">Custom</option></select></label>}</form.Field>
          <form.Field name="symbol">{(field) => <input aria-label="Workspace symbol" placeholder="Symbol/Focus" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />}</form.Field>
          <Button type="submit" variant="primary" isDisabled={mutation.isPending}><Plus size={16} /> Save</Button>
          <Button variant="secondary" onClick={() => bootstrap.mutate()} isDisabled={bootstrap.isPending}>Bootstrap OS</Button>
        </form>
      </Card>
      <section className="tableSection"><h2>Workspace Records</h2><DataTable data={workspaces.data ?? []} /></section>
    </section>
  );
}
