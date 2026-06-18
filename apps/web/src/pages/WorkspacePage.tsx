import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { tradingPiApi } from "@/api/client";
import { WorkspaceList } from "@/components/mvp";

// Extracted tab components — each in its own module
import {
  DecisionsTab,
  JournalTab,
  OverviewTab,
  ResearchSessionList,
  ReviewTab,
  ResearchTab,
  workspaceTabs,
} from "./workspace/components";
import { deriveMetrics } from "./workspace/workspace-utils";

type WorkspaceTab = typeof workspaceTabs extends Array<{ id: infer T }> ? T : never;

export function WorkspacePage(): React.ReactElement {
  const location = useLocation();
  const workspaceId = location.pathname.match(/^\/workspace\/([^/]+)/)?.[1];
  return workspaceId ? <WorkspaceDetail workspaceId={decodeURIComponent(workspaceId)} /> : <WorkspaceListPage />;
}

function WorkspaceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [topicType, setTopicType] = useState("custom");
  const { data, isLoading } = useQuery({ queryKey: ["workspaces"], queryFn: () => tradingPiApi.workspaces().catch(() => []) });
  const workspaces = Array.isArray(data) ? data : [];
  const createWorkspace = useMutation({
    mutationFn: () => tradingPiApi.createWorkspace({ name: name.trim() || "Untitled Workspace", topicType, description: `${topicType} decision workspace` }),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setName("");
      navigate({ to: "/workspace/$workspaceId", params: { workspaceId: result.workspace?.id ?? result.id } });
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Research, decisions, journal, review, and paper-trade loops by topic.</p>
        </div>
        <div className="flex gap-2">
          <input className="w-56 rounded-md border bg-card/70 px-3 py-2 text-sm outline-none focus:border-cyan-400/50" onChange={(event) => setName(event.target.value)} placeholder="Workspace name" value={name} />
          <select className="rounded-md border bg-card/70 px-3 py-2 text-sm outline-none" onChange={(event) => setTopicType(event.target.value)} value={topicType}>
            <option value="custom">Custom</option>
            <option value="polymarket">Polymarket</option>
            <option value="crypto">Crypto</option>
            <option value="macro">Macro</option>
          </select>
          <button className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black disabled:opacity-50" disabled={createWorkspace.isPending} onClick={() => createWorkspace.mutate()} type="button">
            <PlusIcon className="size-4" />
            Create
          </button>
        </div>
      </div>

      {/* WorkspaceListView */}
      <WorkspaceList isLoading={isLoading} onCreateClick={() => createWorkspace.mutate()} workspaces={workspaces} />
    </main>
  );
}

function WorkspaceDetail({ workspaceId }: { workspaceId: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchParams = useMemo(() => new URLSearchParams(location.searchStr ?? ""), [location.searchStr]);
  const requestedTab = searchParams.get("tab") as WorkspaceTab | null;
  const handoffTopic = searchParams.get("topic") ?? "";
  const autoDeepResearch = searchParams.get("deepResearch") === "1";
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    requestedTab && workspaceTabs.some((tab) => tab.id === requestedTab) ? requestedTab : "overview",
  );
  const [deepResearchStartKey, setDeepResearchStartKey] = useState(0);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [workspaceNotice, setWorkspaceNotice] = useState("");

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => tradingPiApi.workspace(workspaceId).catch(() => null),
  });
  const { data: decisions } = useQuery({
    queryKey: ["decisions", workspaceId],
    queryFn: () => tradingPiApi.decisions(workspaceId).catch(() => []),
  });
  const { data: trades } = useQuery({
    queryKey: ["paper-trades", workspaceId],
    queryFn: () => tradingPiApi.paperTrades(workspaceId).catch(() => []),
  });
  const { data: journal } = useQuery({
    queryKey: ["journal"],
    queryFn: () => tradingPiApi.journal().catch(() => []),
  });
  const { data: reviews } = useQuery({
    queryKey: ["reviews", workspaceId],
    queryFn: () => tradingPiApi.reviews(workspaceId).catch(() => []),
  });
  const { data: researchSessions } = useQuery({
    queryKey: ["research-sessions", workspaceId],
    queryFn: () => tradingPiApi.researchSessions(workspaceId).catch(() => []),
  });
  const { data: timeline } = useQuery({
    queryKey: ["timeline"],
    queryFn: () => tradingPiApi.timeline().catch(() => []),
  });
  useEffect(() => {
    if (!workspace) return;
    setDraftName(workspace.name ?? "");
    setDraftDescription(workspace.description ?? "");
  }, [workspace]);

  const updateWorkspace = useMutation({
    mutationFn: () => tradingPiApi.updateWorkspace(workspaceId, { name: draftName.trim(), description: draftDescription.trim() }),
    onSuccess: () => {
      setWorkspaceNotice("Workspace updated.");
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["layout-workspaces"] });
    },
    onError: (error: Error) => setWorkspaceNotice(`Workspace update failed: ${error.message}`),
  });
  const deleteWorkspace = useMutation({
    mutationFn: () => tradingPiApi.deleteWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["layout-workspaces"] });
      navigate({ to: "/workspace" });
    },
    onError: (error: Error) => setWorkspaceNotice(`Workspace delete failed: ${error.message}`),
  });

  const workspaceDecisions = Array.isArray(decisions) ? decisions : [];
  const workspaceTrades = Array.isArray(trades) ? trades : [];
  const workspaceJournal = (Array.isArray(journal) ? journal : []).filter(
    (entry: any) => entry.workspace_id === workspaceId || entry.workspaceId === workspaceId,
  );
  const workspaceReviews = Array.isArray(reviews) ? reviews : [];
  const workspaceResearch = Array.isArray(researchSessions) ? researchSessions : [];
  const workspaceEvents = (Array.isArray(timeline) ? timeline : [])
    .filter((event: any) =>
      JSON.stringify(event.payload_json ?? event.payload ?? "").includes(workspaceId),
    )
    .slice(0, 10);
  const metrics = useMemo(
    () => deriveMetrics(workspaceDecisions, workspaceTrades, workspaceJournal),
    [workspaceDecisions, workspaceTrades, workspaceJournal],
  );

  return (
    <main className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-4 text-sm text-muted-foreground">
        <Link to="/workspace" className="hover:text-foreground">Workspaces</Link>
        <span className="px-2">/</span>
        <span>{workspace?.name ?? workspaceId}</span>
      </div>
      <section className="mb-5 rounded-lg border bg-card/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">{workspace?.name ?? "Workspace"}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{workspace?.description || "Decision workspace"}</p>
            <div className="mt-4 grid gap-2 md:grid-cols-[minmax(12rem,0.5fr)_1fr_auto_auto]">
              <input
                aria-label="Workspace name"
                className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
                onChange={(event) => setDraftName(event.target.value)}
                value={draftName}
              />
              <input
                aria-label="Workspace description"
                className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
                onChange={(event) => setDraftDescription(event.target.value)}
                value={draftDescription}
              />
              <button
                className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
                disabled={!draftName.trim() || updateWorkspace.isPending}
                onClick={() => updateWorkspace.mutate()}
                type="button"
              >
                {updateWorkspace.isPending ? "Saving" : "Save Changes"}
              </button>
              <button
                className="rounded-md border border-red-400/40 px-3 py-2 text-sm text-red-200 disabled:opacity-50"
                disabled={deleteWorkspace.isPending || workspace?.isDefault || workspace?.id === "workspace_general"}
                onClick={() => {
                  if (confirm(`Delete workspace "${workspace?.name ?? workspaceId}"?`)) deleteWorkspace.mutate();
                }}
                type="button"
              >
                {deleteWorkspace.isPending ? "Deleting" : "Delete Workspace"}
              </button>
            </div>
            {workspaceNotice && <p className="mt-2 text-xs text-cyan-200">{workspaceNotice}</p>}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded border border-cyan-400/20 px-2 py-1 text-cyan-200">{workspace?.topicType ?? workspace?.kind ?? "custom"}</span>
            <span className="rounded border border-white/10 px-2 py-1 text-muted-foreground">{workspace?.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : "created"}</span>
          </div>
        </div>
      </section>

      <nav aria-label="Workspace sections" className="mb-5 flex flex-wrap gap-2" role="tablist">
        {workspaceTabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={`rounded-md border px-3 py-2 text-sm ${activeTab === tab.id ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "bg-card/70 text-muted-foreground hover:text-foreground"}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <OverviewTab
          events={workspaceEvents}
          metrics={metrics}
          setActiveTab={setActiveTab}
          setDeepResearchStartKey={setDeepResearchStartKey}
          trades={workspaceTrades}
          workspace={workspace}
          workspaceId={workspaceId}
        />
      )}
      {activeTab === "research" && (
        <ResearchTab
          autoStart={autoDeepResearch || deepResearchStartKey > 0}
          autoStartKey={deepResearchStartKey}
          initialTopic={handoffTopic}
          researchSessions={workspaceResearch}
          workspace={workspace}
          workspaceId={workspaceId}
        />
      )}
      {activeTab === "decisions" && (
        <DecisionsTab decisions={workspaceDecisions} workspace={workspace} workspaceId={workspaceId} />
      )}
      {activeTab === "journal" && (
        <JournalTab entries={workspaceJournal} trades={workspaceTrades} workspaceName={workspace?.name ?? "Workspace"} workspaceId={workspaceId} />
      )}
      {activeTab === "review" && (
        <ReviewTab reviews={workspaceReviews} workspaceId={workspaceId} />
      )}
    </main>
  );
}
