import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { useQuery } from "@tanstack/react-query";
import { Database, KeyRound, MonitorCog, Shield, Workflow } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { DataTable } from "../components/DataTable.js";
import type { ReactNode } from "react";

export function SystemPage() {
  const status = useQuery({ queryKey: ["status"], queryFn: tradingPiApi.status });
  const audit = useQuery({ queryKey: ["audit"], queryFn: tradingPiApi.audit });
  const cache = useQuery({ queryKey: ["cache"], queryFn: tradingPiApi.cache });
  const mcp = useQuery({ queryKey: ["mcp"], queryFn: tradingPiApi.mcpServers });
  const browser = useQuery({ queryKey: ["browser-health"], queryFn: tradingPiApi.browserHealth });
  const memory = useQuery({ queryKey: ["memory-system"], queryFn: () => tradingPiApi.memoryQuery({ limit: 25 }) });

  return (
    <section className="pageStack">
      <header className="pageHeader"><h1>System</h1><p>Permissions, secrets, cache, MCP, AIO Sandbox, memory, and trading mode.</p></header>
      <Card className="heroPanel">
        <Card.Header className="panelTitle"><MonitorCog size={16} /> Runtime Status <Chip size="sm" color="primary" variant="solid">local-first</Chip></Card.Header>
        <div className="marketHeroGrid">
          <Metric icon={<KeyRound size={16} />} label="OpenAI" value={status.data?.env.openai.configured ? "configured" : "missing"} />
          <Metric icon={<Shield size={16} />} label="Trading Mode" value={status.data?.env.local.tradingMode ?? "paper"} />
          <Metric icon={<Workflow size={16} />} label="Workflows" value={status.data?.workflows ?? 0} />
          <Metric icon={<Database size={16} />} label="MCP Servers" value={mcp.data?.length ?? 0} />
          <Metric icon={<Database size={16} />} label="AIO Sandbox" value={browser.data?.configured ? "configured" : "unavailable"} />
          <Metric icon={<Database size={16} />} label="Memory Domains" value={status.data?.memoryDomains?.length ?? 0} />
        </div>
      </Card>
      <section className="tableSection"><h2>Memory Records</h2><DataTable data={memory.data?.output ?? []} /></section>
      <section className="tableSection"><h2>Audit Records</h2><DataTable data={audit.data ?? []} /></section>
      <section className="tableSection"><h2>Data Cache</h2><DataTable data={cache.data ?? []} /></section>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return <div className="metric">{icon}<span>{label}</span><strong>{value}</strong></div>;
}
