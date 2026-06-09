import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
      <section className="tableSection"><h2>Marketplace Catalog</h2><DataTable data={marketplace.data ?? []} /></section>
      <section className="tableSection"><h2>MCP Registry</h2><DataTable data={mcp.data ?? []} /></section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
