import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Copy, Expand, FileText } from "lucide-react";
import { tradingPiApi } from "../api/client.js";

export function Panel() {
  const [activeTab, setActiveTab] = useState<"artifact" | "timeline">("timeline");

  const artifacts = (useQuery as any)({ queryKey: ["artifacts"], queryFn: tradingPiApi.artifacts });
  const timeline = (useQuery as any)({ queryKey: ["timeline"], queryFn: tradingPiApi.timeline });

  const latestArtifact: any = (artifacts.data ?? [])[0];
  const hasArtifact = Boolean(latestArtifact);

  return (
    <aside className="panel" id="rightPanel">
      <div className="panelTabs">
        <button
          className={`panelTab ${activeTab === "artifact" ? "active" : ""}`}
          onClick={() => setActiveTab("artifact")}
        >
          Artifact
        </button>
        <button
          className={`panelTab ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          Timeline
        </button>
      </div>

      <div className="panelContent">
        {activeTab === "artifact" && (
          <div className="artifactViewer">
            {hasArtifact ? (
              <>
                <div className="artifactViewer-header">
                  <h2><FileText size={14} /> {latestArtifact.title}</h2>
                  <div className="artifactViewer-actions">
                    <button onClick={() => navigator.clipboard.writeText(latestArtifact.summary)}>
                      <Copy size={12} /> Copy
                    </button>
                    <button>
                      <Expand size={12} /> Fullscreen
                    </button>
                  </div>
                </div>
                <div className="artifactViewer-content">
                  {latestArtifact.summary}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "13px", gap: "8px" }}>
                <FileText size={24} style={{ opacity: 0.3 }} />
                <p>No artifact yet.</p>
                <p style={{ fontSize: "11px" }}>Ask the agent to research or plan a trade.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="timelineCompact">
            {(timeline.data ?? []).length > 0 ? (
              (timeline.data ?? []).slice(0, 30).map((event: any) => (
                <div className="timelineCompact-item" key={event.id}>
                  <span className={`t-dot ${event.status}`} />
                  <div>
                    <div className="t-title">{event.title}</div>
                    <div className="t-meta">{event.type} · {event.status}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "13px", gap: "8px" }}>
                <Activity size={24} style={{ opacity: 0.3 }} />
                <p>No events yet.</p>
                <p style={{ fontSize: "11px" }}>Events appear when you send a command.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
