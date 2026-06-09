import { useQuery } from "@tanstack/react-query";
import { Activity, Boxes, BrainCircuit, Shield, Workflow } from "lucide-react";
import { tradingPiApi } from "../api/client.js";

export function Inspector() {
  const timeline = useQuery({ queryKey: ["timeline"], queryFn: tradingPiApi.timeline });
  const approvals = useQuery({ queryKey: ["approvals"], queryFn: tradingPiApi.approvals });
  const skills = useQuery({ queryKey: ["skills"], queryFn: tradingPiApi.skills });
  const status = useQuery({ queryKey: ["status"], queryFn: tradingPiApi.status });

  return (
    <aside className="inspectorRail">
      <section className="inspectorPanel">
        <div className="panelTitle"><Activity size={16} /> Execution Timeline</div>
        <div className="timelineList">
          {(timeline.data ?? []).slice(0, 18).map((event) => (
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
      </section>

      <section className="inspectorPanel">
        <div className="panelTitle"><BrainCircuit size={16} /> Active Skills</div>
        <div className="skillChips">
          {(skills.data ?? []).slice(0, 10).map((skill) => <span key={String(skill.id)}>{String(skill.id)}</span>)}
        </div>
      </section>

      <section className="inspectorPanel compactPanel">
        <div className="panelTitle"><Shield size={16} /> Risk</div>
        {(approvals.data ?? []).slice(0, 4).map((approval) => (
          <div className="approvalMini" key={approval.id}>
            <strong>{approval.action}</strong>
            <span>{approval.status}</span>
          </div>
        ))}
        {!approvals.data?.length && <p className="empty">No pending approvals.</p>}
      </section>

      <section className="inspectorPanel compactPanel">
        <div className="panelTitle"><Boxes size={16} /> Runtime</div>
        <div className="runtimeGrid">
          <span>MCP</span><strong>available</strong>
          <span>Sandbox</span><strong>local</strong>
          <span>Memory</span><strong>SQLite</strong>
          <span>AI</span><strong>{status.data?.env.openai.configured ? "ready" : "missing"}</strong>
          <span>Workflows</span><strong><Workflow size={12} /> {status.data?.workflows ?? 0}</strong>
        </div>
      </section>
    </aside>
  );
}
