import { Button } from "@/components/ui/button";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Play, ShieldCheck } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { DataTable } from "../components/DataTable.js";
import { useSession } from "../components/session.js";

export function EvolutionPage() {
  const { sessionId, setSessionId } = useSession();
  const queryClient = useQueryClient();
  const strategies = useQuery({ queryKey: ["strategies"], queryFn: tradingPiApi.strategies });
  const backtests = useQuery({ queryKey: ["backtests"], queryFn: tradingPiApi.backtests });
  const proposals = useQuery({ queryKey: ["evolution-proposals"], queryFn: tradingPiApi.evolutionProposals });
  const evolve = useMutation({
    mutationFn: () => tradingPiApi.runWorkflow("evolution.propose", { focus: "paper trading discipline and strategy scoring" }, sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });

  return (
    <section className="pageStack">
      <header className="pageHeader">
        <div>
          <h1>Evolution</h1>
          <p>Review {"->"} Backtest {"->"} Proposal {"->"} Approval {"->"} Strategy lifecycle. Still one Trading Pi Agent.</p>
        </div>
        <Button variant="default" onClick={() => evolve.mutate()} disabled={evolve.isPending}><Play size={16} /> Propose Evolution</Button>
      </header>
      <Card className="heroPanel">
        <Card.Header className="panelTitle"><Brain size={16} /> Evolution Loop <Chip size="sm" color="warning" variant="soft">guarded</Chip></Card.Header>
        <div className="journeyGrid">
          {["Review memory", "Backtest bridge", "Proposal artifact", "Approval gate", "Strategy lifecycle"].map((item, index) => (
            <div className="journeyStep" key={item}><strong>{index + 1}. {item}</strong><span>{index === 3 ? "dangerous changes blocked" : "observable artifact-first step"}</span></div>
          ))}
        </div>
      </Card>
      {evolve.data && <article className="skillRunCard"><ShieldCheck size={18} /><div><strong>Evolution proposal created</strong><p>Proposal artifact persisted and approval gate opened before any strategy change can apply.</p></div></article>}
      <section className="tableSection"><h2>Strategies</h2><DataTable data={strategies.data ?? []} /></section>
      <section className="tableSection"><h2>Backtests</h2><DataTable data={backtests.data ?? []} /></section>
      <section className="tableSection"><h2>Evolution Proposals</h2><DataTable data={proposals.data ?? []} /></section>
    </section>
  );
}
