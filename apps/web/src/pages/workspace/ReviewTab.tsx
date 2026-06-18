/**
 * ReviewTab — Trigger manual review + accordion list of past reviews.
 *
 * Extracted from workspace/components.tsx.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListChecksIcon } from "lucide-react";
import { tradingPiApi } from "@/api/client";
import { ReviewAccordion } from "@/components/mvp";
import { WorkspaceEmpty } from "./components";

export function ReviewTab({ reviews, workspaceId }: { reviews: any[]; workspaceId: string }) {
  const queryClient = useQueryClient();
  const requestReview = useMutation({
    mutationFn: () => tradingPiApi.runWorkflow("review.workspace", { workspaceId, period: "manual" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews", workspaceId] }),
  });
  return (
    <section className="space-y-3">
      <button className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black disabled:opacity-50" disabled={requestReview.isPending} onClick={() => requestReview.mutate()} type="button">
        <ListChecksIcon className="size-4" />
        Request Review
      </button>
      {reviews.length === 0 ? <WorkspaceEmpty text="No reviews yet." /> : reviews.map((review) => <ReviewAccordion key={review.id} review={review} />)}
    </section>
  );
}
