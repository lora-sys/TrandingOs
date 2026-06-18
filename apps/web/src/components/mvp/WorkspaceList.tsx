import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BriefcaseIcon, ChevronRightIcon, FileTextIcon, PlusIcon } from "lucide-react";

export function WorkspaceList({
  workspaces,
  isLoading,
  onCreateClick,
}: {
  workspaces: any[];
  isLoading?: boolean;
  onCreateClick?: () => void;
}) {
  if (isLoading) return <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div className="h-36 animate-pulse rounded-lg border bg-card/60" key={index} />)}</section>;
  if (workspaces.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/70 p-8 text-center">
        <BriefcaseIcon className="mx-auto size-8 text-cyan-300" />
        <h2 className="mt-3 text-lg font-medium">Create your first workspace</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Workspaces keep research, decisions, journal entries, reviews, and paper trades together by topic.</p>
        {onCreateClick && <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black" onClick={onCreateClick} type="button"><PlusIcon className="size-4" /> Create</button>}
      </div>
    );
  }
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {workspaces.map((workspace: any, index: number) => <WorkspaceCard index={index} key={workspace.id} workspace={workspace} />)}
    </section>
  );
}

function WorkspaceCard({ workspace, index }: { workspace: any; index: number }) {
  return (
    <motion.article animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-card/70 p-4 backdrop-blur-xl transition-colors hover:border-cyan-400/30" initial={{ opacity: 0, y: 8 }} transition={{ delay: index * 0.03 }}>
      <Link to="/workspace/$workspaceId" params={{ workspaceId: workspace.id }} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BriefcaseIcon className="size-4 text-cyan-300" />
              <span className="truncate">{workspace.name}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{workspace.description || "No description yet."}</p>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded border border-white/10 px-2 py-1 text-muted-foreground">{workspace.topicType || workspace.kind}</span>
          <span className="rounded border border-white/10 px-2 py-1 text-muted-foreground">{workspace.decisionCount ?? 0} decisions</span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <FileTextIcon className="size-3.5" />
          Updated {workspace.updatedAt ? new Date(workspace.updatedAt).toLocaleString() : "recently"}
        </div>
      </Link>
    </motion.article>
  );
}
