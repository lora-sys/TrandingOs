import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { useQuery } from "@tanstack/react-query";
import { Activity, Boxes, BrainCircuit, Shield, Workflow } from "lucide-react";
import { tradingPiApi } from "../api/client.js";

export function Inspector() {
  const timeline = (useQuery as any)({ queryKey: ["timeline"], queryFn: tradingPiApi.timeline });
  const approvals = (useQuery as any)({ queryKey: ["approvals"], queryFn: tradingPiApi.approvals });
  const skills = (useQuery as any)({ queryKey: ["skills"], queryFn: tradingPiApi.skills });
  const status = (useQuery as any)({ queryKey: ["status"], queryFn: tradingPiApi.status });
  const mcp = (useQuery as any)({ queryKey: ["mcp"], queryFn: tradingPiApi.mcpServers });
  const browser = (useQuery as any)({ queryKey: ["browser-health"], queryFn: tradingPiApi.browserHealth });

  return (
    <aside className="inspectorRail">
      <Card className="inspectorPanel heroPanel">
        <Card.Header className="panelTitle"><Activity size={16} /> Execution Timeline</Card.Header>
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
          {!timeline.data?.length && <p className="empty">No execution events yet.</p>}
        </div>
      </Card>

      <Card className="inspectorPanel heroPanel">
        <Card.Header className="panelTitle"><BrainCircuit size={16} /> Active Skills</Card.Header>
        <div className="skillChips">
          {(skills.data ?? []).slice(0, 10).map((skill: any) => <Chip key={String(skill.id)} size="sm" variant="flat" color="primary">{String(skill.id)}</Chip>)}
        </div>
      </Card>

      <Card className="inspectorPanel compactPanel heroPanel">
        <Card.Header className="panelTitle"><Shield size={16} /> Risk</Card.Header>
        {(approvals.data ?? []).slice(0, 4).map((approval: any) => (
          <div className="approvalMini" key={approval.id}>
            <strong>{approval.action}</strong>
            <span>{approval.status}</span>
          </div>
        ))}
        {!approvals.data?.length && <p className="empty">No pending approvals.</p>}
      </Card>

      <Card className="inspectorPanel compactPanel heroPanel">
        <Card.Header className="panelTitle"><Boxes size={16} /> Runtime</Card.Header>
        <div className="runtimeGrid">
          <span>MCP</span><strong>registry</strong>
          <span>MCP Count</span><strong>{mcp.data?.length ?? status.data?.mcpServers ?? 0}</strong>
          <span>Sandbox</span><strong>{browser.data?.configured ? "AIO configured" : "AIO unavailable"}</strong>
          <span>Browser Runs</span><strong>{status.data?.browserSessions ?? 0}</strong>
          <span>Memory</span><strong>{status.data?.memoryDomains?.length ?? 0} domains</strong>
          <span>AI</span><strong>{status.data?.env?.openaiModel ? "ready" : "missing"}</strong>
          <span>Permissions</span><strong>explicit</strong>
          <span>Mode</span><strong>paper</strong>
          <span>Workflows</span><strong><Workflow size={12} /> {status.data?.workflows ?? 0}</strong>
        </div>
      </Card>
    </aside>
  );
}
