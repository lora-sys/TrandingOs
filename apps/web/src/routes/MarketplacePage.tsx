import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Boxes, RefreshCw } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { DataTable } from "../components/DataTable.js";
import { useSession } from "../components/session.js";

export function MarketplacePage() {
  const { sessionId, setSessionId } = useSession();
  const queryClient = useQueryClient();
  const marketplace = useQuery({ queryKey: ["marketplace"], queryFn: tradingPiApi.marketplace });
  const mcp = useQuery({ queryKey: ["mcp"], queryFn: tradingPiApi.mcpServers });
  const browser = useQuery({ queryKey: ["browser-health"], queryFn: tradingPiApi.browserHealth });
  const discover = useMutation({
    mutationFn: (q: string) => tradingPiApi.discoverMcp(q, sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  const register = useMutation({
    mutationFn: (value: { name: string; url: string; permission: string }) =>
      tradingPiApi.registerMcp({ name: value.name, url: value.url || undefined, permission: value.permission, capabilities: ["search.query"] }, sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  const health = useMutation({
    mutationFn: (id: string) => tradingPiApi.checkMcp(id, sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  const form = useForm({
    defaultValues: { name: "Exa Search MCP", url: "", permission: "read" },
    onSubmit: async ({ value }) => register.mutateAsync(value),
  });
  const seed = useMutation({
    mutationFn: () => tradingPiApi.seedMarketplace(sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  return (
    <section className="pageStack">
      <header className="pageHeader"><h1>Trading Pi Marketplace</h1><p>Local catalog for Skills, Workflows, MCP servers, and Templates. Network install comes later.</p></header>
      <Card className="heroPanel marketHero">
        <Card.Header className="panelTitle"><Boxes size={16} /> OS Marketplace <Chip size="sm" color="primary" variant="solid">local-first</Chip></Card.Header>
        <div className="marketHeroGrid">
          <Metric label="Catalog Items" value={marketplace.data?.length ?? 0} />
          <Metric label="MCP Servers" value={mcp.data?.length ?? 0} />
          <Metric label="AIO Sandbox" value={browser.data?.configured ? "configured" : "off"} />
          <Button variant="primary" onClick={() => seed.mutate()} isDisabled={seed.isPending}><RefreshCw size={16} /> Seed Catalog</Button>
        </div>
      </Card>
      <Card className="controlPanel heroPanel">
        <Card.Header className="panelTitle"><Boxes size={16} /> MCP Hub</Card.Header>
        <form className="workspaceForm" onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
          <form.Field name="name">{(field) => <input aria-label="MCP name" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />}</form.Field>
          <form.Field name="url">{(field) => <input aria-label="MCP URL" placeholder="optional local/server URL" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />}</form.Field>
          <form.Field name="permission">{(field) => <label>Permission<select value={field.state.value} onChange={(event) => field.handleChange(event.target.value)}><option value="read">read</option><option value="write">write</option><option value="dangerous">dangerous</option></select></label>}</form.Field>
          <Button type="submit" variant="primary" isDisabled={register.isPending}>Register MCP</Button>
          <Button variant="secondary" onClick={() => discover.mutate("")} isDisabled={discover.isPending}>Discover</Button>
        </form>
      </Card>
      {discover.data && <article className="skillRunCard"><Boxes size={18} /><div><strong>MCP Discovery completed</strong><p>Local MCP candidates were written to discovery/audit records.</p></div></article>}
      {register.data && <article className="approvalCard"><Boxes size={18} /><div><strong>MCP registration result</strong><p>{JSON.stringify(register.data.output)}</p></div></article>}
      <section className="tableSection"><h2>Marketplace Catalog</h2><DataTable data={marketplace.data ?? []} /></section>
      <section className="tableSection">
        <h2>MCP Registry</h2>
        <div className="inlineActions">
          {(mcp.data ?? []).slice(0, 4).map((server) => (
            <Button key={String(server.id)} size="sm" variant="secondary" isDisabled={health.isPending} onClick={() => health.mutate(String(server.id))}>
              Health {String(server.name ?? server.id)}
            </Button>
          ))}
        </div>
        <DataTable data={mcp.data ?? []} />
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
