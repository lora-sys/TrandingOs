import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertTriangle, Bot, FileText, Send, Sparkles, User, Workflow } from "lucide-react";
import { useRef, useState } from "react";
import { tradingPiApi } from "../api/client.js";
import type { Artifact, ChatMessage, WorkflowResult } from "../api/types.js";
import { useSession } from "./session.js";

type FeedItem =
  | { id: string; kind: "message"; message: ChatMessage }
  | { id: string; kind: "artifact"; artifact: Artifact }
  | { id: string; kind: "workflow"; title: string; result: WorkflowResult }
  | { id: string; kind: "notice"; title: string; detail: string };

export function ChatWorkspace() {
  const queryClient = useQueryClient();
  const { sessionId, setSessionId } = useSession();
  const [localItems, setLocalItems] = useState<FeedItem[]>([]);
  const messages = useQuery({ queryKey: ["messages", sessionId], queryFn: () => tradingPiApi.messages(sessionId) });
  const artifacts = useQuery({ queryKey: ["artifacts"], queryFn: tradingPiApi.artifacts });
  const parentRef = useRef<HTMLDivElement | null>(null);

  const feed: FeedItem[] = [
    ...(messages.data?.messages ?? []).map((message) => ({ id: message.id, kind: "message" as const, message })),
    ...localItems,
    ...(artifacts.data ?? []).slice(0, 6).map((artifact) => ({ id: artifact.id, kind: "artifact" as const, artifact })),
  ];

  const virtualizer = useVirtualizer({
    count: feed.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 116,
    overscan: 8,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["messages"] }),
      queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      queryClient.invalidateQueries({ queryKey: ["artifacts"] }),
      queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
      queryClient.invalidateQueries({ queryKey: ["journal"] }),
      queryClient.invalidateQueries({ queryKey: ["reviews"] }),
    ]);
  };

  const mutation = useMutation({
    mutationFn: async (prompt: string) => runPrompt(prompt, sessionId),
    onSuccess: async (result) => {
      if (result.sessionId) setSessionId(result.sessionId);
      setLocalItems((items) => [
        ...items,
        { id: `wf_${Date.now()}`, kind: "workflow", title: result.title, result: result.workflowResult },
      ]);
      await refresh();
    },
    onError: (error) => {
      setLocalItems((items) => [
        ...items,
        { id: `err_${Date.now()}`, kind: "notice", title: "Execution failed", detail: error instanceof Error ? error.message : String(error) },
      ]);
    },
  });

  const form = useForm({
    defaultValues: { prompt: "/research ETH" },
    onSubmit: async ({ value }) => {
      const prompt = value.prompt.trim();
      if (!prompt) return;
      setLocalItems((items) => [
        ...items,
        { id: `user_${Date.now()}`, kind: "message", message: { id: `local_${Date.now()}`, role: "user", kind: "message", content: prompt, timestamp: new Date().toISOString(), raw: null } },
      ]);
      form.setFieldValue("prompt", "");
      await mutation.mutateAsync(prompt);
    },
  });

  return (
    <section className="chatWorkspace">
      <div className="chatHeader">
        <div>
          <h1>Trading Pi Agent</h1>
          <p>One core agent, Workflow + Skills, local artifacts, approval-first execution.</p>
        </div>
        <div className="commandHints">
          <Chip size="sm" variant="flat" color="primary">/research ETH</Chip>
          <Chip size="sm" variant="flat" color="success">/plan ETH/USDT 100 spot</Chip>
          <Chip size="sm" variant="flat" color="warning">/review-day</Chip>
        </div>
      </div>

      <Card className="messageViewport heroPanel" ref={parentRef}>
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = feed[virtualRow.index];
            if (!item) return null;
            return (
              <div
                key={item.id}
                className="virtualRow"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <FeedCard item={item} />
              </div>
            );
          })}
        </div>
        {!feed.length && <div className="emptyState"><Bot size={28} /> Start with a slash command or ask Trading Pi directly.</div>}
      </Card>

      <Card className="composerCard heroPanel">
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="prompt">
            {(field) => (
              <textarea
                aria-label="Trading Pi composer"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void form.handleSubmit();
                  }
                }}
                placeholder="Ask Trading Pi or run /research, /plan, /review-day..."
                rows={1}
              />
            )}
          </form.Field>
          <Button type="submit" variant="primary" isDisabled={mutation.isPending} title="Send">
            <Send size={18} />
          </Button>
        </form>
      </Card>
    </section>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  if (item.kind === "message") {
    const Icon = item.message.role === "user" ? User : Bot;
    return (
      <Card className={`feedCard messageBubble ${item.message.role}`}>
        <Card.Header className="feedCardHeader">
          <Icon size={16} />
          <Chip size="sm" variant="flat" color={item.message.role === "user" ? "primary" : "success"}>{item.message.role}</Chip>
        </Card.Header>
        <Card.Content className="feedCardBody">
          <p>{item.message.content || item.message.kind}</p>
        </Card.Content>
      </Card>
    );
  }
  if (item.kind === "artifact") {
    return (
      <Card className="feedCard artifactCard">
        <Card.Header className="feedCardHeader">
          <FileText size={18} />
          <strong>{item.artifact.title}</strong>
          <Chip size="sm" variant="flat" color="success">{item.artifact.type}</Chip>
        </Card.Header>
        <Card.Content className="feedCardBody">
          <p>{item.artifact.summary}</p>
        </Card.Content>
      </Card>
    );
  }
  if (item.kind === "workflow") {
    return (
      <Card className="feedCard skillRunCard">
        <Card.Header className="feedCardHeader">
          <Workflow size={18} />
          <strong>{item.title}</strong>
          <Chip size="sm" variant="flat" color="primary">workflow</Chip>
        </Card.Header>
        <Card.Content className="feedCardBody">
          <p>{artifactSummary(item.result.output)}</p>
        </Card.Content>
      </Card>
    );
  }
  return (
    <Card className="feedCard approvalCard">
      <Card.Header className="feedCardHeader">
        <AlertTriangle size={18} />
        <strong>{item.title}</strong>
        <Chip size="sm" variant="flat" color="warning">approval</Chip>
      </Card.Header>
      <Card.Content className="feedCardBody">
        <p>{item.detail}</p>
      </Card.Content>
    </Card>
  );
}

async function runPrompt(prompt: string, sessionId?: string) {
  const research = prompt.match(/^\/research\s+(.+)$/i);
  if (research) {
    const result = await tradingPiApi.runWorkflow("research.asset", { symbol: research[1]?.trim() ?? "ETH" }, sessionId);
    return { sessionId: result.sessionId, title: "Research workflow completed", workflowResult: result };
  }
  const plan = prompt.match(/^\/plan\s+(\S+)(?:\s+(\d+(?:\.\d+)?))?(?:\s+(\S+))?/i);
  if (plan) {
    const result = await tradingPiApi.runWorkflow(
      "trade.plan",
      { symbol: plan[1] ?? "ETH/USDT", budgetUsd: Number(plan[2] ?? 100), direction: plan[3] ?? "spot" },
      sessionId,
    );
    return { sessionId: result.sessionId, title: "Trade plan workflow completed", workflowResult: result };
  }
  if (/^\/review-day/i.test(prompt)) {
    const result = await tradingPiApi.runWorkflow("review.daily", { period: "daily" }, sessionId);
    return { sessionId: result.sessionId, title: "Daily review completed", workflowResult: result };
  }
  const result = await tradingPiApi.sendMessage(prompt, sessionId);
  return {
    sessionId: result.sessionId,
    title: "Agent response completed",
    workflowResult: { sessionId: result.sessionId, runId: "agent.prompt", output: { text: result.text } },
  };
}

function artifactSummary(output: unknown) {
  const text = JSON.stringify(output);
  if (text.includes("approvalId")) return "Approval card created. Check the Risk panel.";
  if (text.includes("artifact")) return "Artifacts created. Cards are visible in the feed and Artifact panel.";
  return "Workflow completed through Trading Pi skills.";
}
