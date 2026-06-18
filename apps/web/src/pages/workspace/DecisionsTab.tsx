/**
 * DecisionsTab — New decision form + decision list with paper-trade execution.
 *
 * Extracted from workspace/components.tsx.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScaleIcon } from "lucide-react";
import { tradingPiApi } from "@/api/client";
import {
  DecisionCard as MvpDecisionCard,
  DecisionForm,
  type DecisionFormValue,
} from "@/components/mvp";
import { WorkspaceEmpty } from "./components";

export function DecisionsTab({ decisions, workspace, workspaceId }: { decisions: any[]; workspace: any; workspaceId: string }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const createDecision = useMutation({
    mutationFn: (value: DecisionFormValue) =>
      tradingPiApi.createDecision({ workspaceId, ...value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decisions", workspaceId] });
      setNotice("Decision saved. Confirm it to execute a paper trade.");
    },
  });
  const executePaperTrade = useMutation({
    mutationFn: (decision: any) =>
      tradingPiApi.createPaperTrade({
        decisionId: decision.id,
        asset: decision.topic,
        settlementReason: "confirmed_from_workspace_decisions",
      }),
    onSuccess: (_result, decision) => {
      setNotice(`Paper trade opened for ${decision.topic}. Journal entry created automatically.`);
      queryClient.invalidateQueries({ queryKey: ["decisions", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["paper-trades", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
    onError: (error: Error) => {
      setNotice(`Paper trade execution failed: ${error.message}`);
    },
  });
  const executingDecisionId = executePaperTrade.variables?.id;
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-lg border bg-card/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <ScaleIcon className="size-4 text-cyan-300" />
          New Decision
        </div>
        <DecisionForm busy={createDecision.isPending} onSubmit={(value) => createDecision.mutate(value)} topic={workspace?.name ?? "Workspace decision"} />
        {notice && <div className="mt-3 rounded-md border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">{notice}</div>}
      </section>
      <section className="space-y-3">
        {decisions.length === 0 ? <WorkspaceEmpty text="No decisions yet." /> : decisions.map((decision) => (
          <MvpDecisionCard
            confirmBusy={executePaperTrade.isPending && executingDecisionId === decision.id}
            decision={decision}
            key={decision.id}
            onConfirm={decision.status === "pending" ? () => executePaperTrade.mutate(decision) : undefined}
          />
        ))}
      </section>
    </div>
  );
}
