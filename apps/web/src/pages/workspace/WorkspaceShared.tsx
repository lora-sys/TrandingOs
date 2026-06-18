/**
 * Small shared workspace UI primitives — too small to warrant individual files,
 * used by multiple tab components.
 */

/** Empty state placeholder */
export function WorkspaceEmpty({ text }: { text: string }) {
  return <div className="rounded-lg border bg-card/70 p-6 text-sm text-muted-foreground">{text}</div>;
}

/** Research session list for the research tab */
export function ResearchSessionList({
  sessions,
  onOpenReport,
  busySessionId,
}: {
  sessions: any[];
  onOpenReport?: (session: any) => void;
  busySessionId?: string;
}) {
  return sessions.length === 0 ? <WorkspaceEmpty text="No research sessions yet." /> : (
    <div className="space-y-2">
      {sessions.map((session) => (
        <article className="rounded border border-white/10 p-3 text-sm" key={session.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{session.topic} · {session.status}</span>
            {session.status === "completed" && onOpenReport && (
              <button className="rounded-md border border-cyan-400/30 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-400/10 disabled:opacity-50" disabled={busySessionId === session.id} onClick={() => onOpenReport(session)} type="button">
                {busySessionId === session.id ? "Loading" : "View Report"}
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
