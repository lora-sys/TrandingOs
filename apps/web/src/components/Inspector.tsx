import { useQuery } from "@tanstack/react-query";
import { Activity, Boxes, BrainCircuit, Shield, Workflow } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { ArtifactPreviewPanel } from "./ArtifactPreviewPanel.js";

export function Inspector() {
  const timeline = (useQuery as any)({ queryKey: ["timeline"], queryFn: tradingPiApi.timeline });
  const approvals = (useQuery as any)({ queryKey: ["approvals"], queryFn: tradingPiApi.approvals });
  const skills = (useQuery as any)({ queryKey: ["skills"], queryFn: tradingPiApi.skills });
  const status = (useQuery as any)({ queryKey: ["status"], queryFn: tradingPiApi.status });
  const mcp = (useQuery as any)({ queryKey: ["mcp"], queryFn: tradingPiApi.mcpServers });
  const browser = (useQuery as any)({ queryKey: ["browser-health"], queryFn: tradingPiApi.browserHealth });

  return (
    <aside className="inspectorRail">
      {/* Timeline */}
      <div className="inspectorCard">
        <div className="inspectorCard-header"><Activity size={14} /> Execution Timeline</div>
        <div className="inspectorCard-body" style={{ padding: "6px 12px" }}>
          <div className="timelineList">
            {(timeline.data ?? []).slice(0, 18).map((event: any) => (
              <div className="timelineItem" key={event.id}>
                <span className={`dot ${event.status}`} />
                <div>
                  <strong>{event.title}</strong>
                  <small>{event.type} · {event.status}</small>
                </div>
              </div>
            ))}
            {!timeline.data?.length && (
              <div className="emptyState">
                <p>No execution events yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="inspectorCard">
        <div className="inspectorCard-header"><BrainCircuit size={14} /> Active Skills</div>
        <div className="inspectorCard-body">
          <div className="skillChips">
            {(skills.data ?? []).slice(0, 10).map((skill: any) => (
              <span key={String(skill.id)} className="skillChip">{String(skill.id)}</span>
            ))}
            {!skills.data?.length && (
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>No skills loaded.</span>
            )}
          </div>
        </div>
      </div>

      {/* Risk / Approvals */}
      <div className="inspectorCard">
        <div className="inspectorCard-header"><Shield size={14} /> Risk & Approvals</div>
        <div className="inspectorCard-body" style={{ padding: "4px 12px" }}>
          {(approvals.data ?? []).slice(0, 4).map((approval: any) => (
            <div className="approvalItem" key={approval.id}>
              <span className="action">{approval.action}</span>
              <span className={`status ${approval.status}`}>{approval.status}</span>
            </div>
          ))}
          {!approvals.data?.length && (
            <div className="emptyState" style={{ padding: "12px 0" }}>
              <p>No pending approvals.</p>
            </div>
          )}
        </div>
      </div>

      {/* Runtime */}
      <div className="inspectorCard">
        <div className="inspectorCard-header"><Boxes size={14} /> Runtime</div>
        <div className="inspectorCard-body">
          <div className="runtimeGrid">
            <span className="label">MCP</span><span className="value">registry</span>
            <span className="label">MCP Count</span><span className="value">{mcp.data?.length ?? status.data?.mcpServers ?? 0}</span>
            <span className="label">Sandbox</span><span className="value">{browser.data?.configured ? "AIO configured" : "AIO unavailable"}</span>
            <span className="label">Browser Runs</span><span className="value">{status.data?.browserSessions ?? 0}</span>
            <span className="label">Memory</span><span className="value">{status.data?.memoryDomains?.length ?? 0} domains</span>
            <span className="label">AI</span><span className="value">{status.data?.env?.openaiModel ? "ready" : "missing"}</span>
            <span className="label">Permissions</span><span className="value">explicit</span>
            <span className="label">Mode</span><span className="value">paper</span>
            <span className="label">Workflows</span><span className="value"><Workflow size={11} /> {status.data?.workflows ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Artifact Preview */}
      <ArtifactPreviewPanel />
    </aside>
  );
}
