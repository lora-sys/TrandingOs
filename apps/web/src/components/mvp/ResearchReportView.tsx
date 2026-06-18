import { DownloadIcon, LinkIcon, MessageSquareIcon, ScaleIcon } from "lucide-react";
import type { ComponentType } from "react";

export function ResearchReportView({
  report,
  onBackToChat,
  onAskFollowUp,
  onGenerateDecision,
}: {
  report: any;
  onBackToChat?: () => void;
  onAskFollowUp?: () => void;
  onGenerateDecision?: () => void;
}) {
  const findings = report?.keyFindings ?? report?.findings ?? [];
  const sources = Array.isArray(report?.dataSourceSummary) ? report.dataSourceSummary : [];
  const summary = typeof report?.executionSummary === "string"
    ? report.executionSummary
    : report?.executionSummary?.summary ?? report?.summary ?? "Research completed.";
  return (
    <div className="grid max-h-[640px] overflow-hidden rounded-lg border bg-card/70 lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
        <div className="text-sm font-medium">{report?.topic ?? "Research Report"}</div>
        <nav className="mt-4 space-y-1 text-sm">
          {["Executive Summary", "Key Findings", "Data Sources", "Conclusion"].map((item) => <a className="block rounded border-l-2 border-transparent px-3 py-2 text-muted-foreground hover:border-cyan-300 hover:text-cyan-200" href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>{item}</a>)}
        </nav>
      </aside>
      <section className="min-h-0 overflow-auto p-5 pb-20">
        <section id="executive-summary" className="rounded-md border border-cyan-400/20 bg-cyan-400/5 p-4">
          <h2 className="text-lg font-semibold">Executive Summary</h2>
          <p className="mt-2 text-sm text-muted-foreground">{summary}</p>
        </section>
        <section id="key-findings" className="mt-5">
          <h2 className="text-lg font-semibold">Key Findings</h2>
          <div className="mt-3 space-y-3">
            {(Array.isArray(findings) && findings.length ? findings : [{ title: "Finding", evidence: "No structured findings available yet.", relevance: "Medium" }]).map((finding: any, index: number) => (
              <article className="rounded-md border border-white/10 p-4" key={finding.title ?? index}>
                <div className="font-medium">{index + 1}. {finding.title ?? finding.summary ?? "Finding"}</div>
                <p className="mt-2 text-sm text-muted-foreground">{finding.evidence ?? finding.detail ?? JSON.stringify(finding).slice(0, 260)}</p>
                <span className="mt-3 inline-block rounded border border-white/10 px-2 py-1 text-xs text-muted-foreground">Relevance: {finding.relevance ?? "Medium"}</span>
              </article>
            ))}
          </div>
        </section>
        <section id="data-sources" className="mt-5 rounded-md border border-white/10 p-4">
          <h2 className="text-lg font-semibold">Data Sources</h2>
          {sources.length ? (
            <div className="mt-3 space-y-2">
              {sources.map((source: any, index: number) => (
                <article className="rounded-md border border-white/10 p-3 text-sm" key={source.source ?? index}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{source.source ?? "Source"}</span>
                    <span className="rounded border border-white/10 px-2 py-1 text-xs text-muted-foreground">{source.count ?? 0} results</span>
                  </div>
                  {Array.isArray(source.keyInsights) && source.keyInsights.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {source.keyInsights.map((insight: string) => <li key={insight}>{insight}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(report?.sources ?? {}, null, 2)}</pre>
          )}
        </section>
        <section id="conclusion" className="mt-5 rounded-md border border-emerald-400/20 bg-emerald-400/5 p-4">
          <h2 className="text-lg font-semibold">Conclusion</h2>
          <p className="mt-2 text-sm text-muted-foreground">{report?.conclusion?.summary ?? report?.conclusion ?? "No conclusion available."}</p>
        </section>
        <div className="sticky bottom-0 mt-6 flex flex-wrap gap-2 border-t border-white/10 bg-card/95 p-3 backdrop-blur-xl">
          <ToolbarButton icon={MessageSquareIcon} label="Return to Chat" onClick={onBackToChat} />
          <ToolbarButton icon={MessageSquareIcon} label="Ask Follow-up" onClick={onAskFollowUp} />
          <ToolbarButton icon={ScaleIcon} label="Generate Decision" onClick={onGenerateDecision} />
          <ToolbarButton icon={DownloadIcon} label="Export .md" onClick={() => exportMarkdown(report)} />
          <ToolbarButton icon={LinkIcon} label="Copy Link" onClick={() => navigator.clipboard?.writeText(location.href)} />
        </div>
      </section>
    </div>
  );
}

function ToolbarButton({ icon: Icon, label, onClick }: { icon: ComponentType<{ className?: string }>; label: string; onClick?: () => void }) {
  return <button className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm hover:border-cyan-400/40" onClick={onClick} type="button"><Icon className="size-4 text-cyan-300" />{label}</button>;
}

function exportMarkdown(report: any) {
  const markdown = `# ${report?.topic ?? "Research Report"}\n\n${JSON.stringify(report, null, 2)}`;
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "research-report.md";
  anchor.click();
  URL.revokeObjectURL(url);
}
