import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileClock, Play } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { DataTable } from "../components/DataTable.js";
import { useSession } from "../components/session.js";

export function ReviewPage() {
  const { sessionId, setSessionId } = useSession();
  const queryClient = useQueryClient();
  const reviews = useQuery({ queryKey: ["reviews"], queryFn: tradingPiApi.reviews });
  const mutation = useMutation({
    mutationFn: () => tradingPiApi.runWorkflow("review.daily", { period: "daily" }, sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });
  return (
    <section className="pageStack">
      <header className="pageHeader"><h1>Review Center</h1><p>Daily and weekly reviews from local paper trades and journals.</p></header>
      <button className="primaryAction" disabled={mutation.isPending} onClick={() => mutation.mutate()}><Play size={16} /> Run Daily Review</button>
      {mutation.data && <article className="skillRunCard"><FileClock size={18} /><div><strong>Daily Review created</strong><p>Review Report artifact and review row persisted.</p></div></article>}
      <section className="tableSection"><h2>Reviews</h2><DataTable data={reviews.data ?? []} /></section>
    </section>
  );
}
