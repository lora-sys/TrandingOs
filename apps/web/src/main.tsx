import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, Bot, Database, FileText, LineChart, Play, Shield, Sparkles } from "lucide-react";
import "./styles.css";

type Status = {
  env: { openai: { configured: boolean; model: string; baseUrl: string | null }; local: { dataDir: string; defaultExchange: string } };
  paths: Record<string, string>;
  langfuseConfigured: boolean;
  skills: number;
  workflows: number;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? response.statusText);
  return json as T;
}

function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [message, setMessage] = useState("Give me a concise Trading Pi status.");
  const [symbol, setSymbol] = useState("ETH/USDT");
  const [budget, setBudget] = useState(100);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [nextStatus, nextTimeline, nextArtifacts, nextApprovals, nextSkills, nextWorkflows, nextSessions] =
      await Promise.all([
        api<Status>("/api/status"),
        api<any[]>("/api/timeline"),
        api<any[]>("/api/artifacts"),
        api<any[]>("/api/approvals"),
        api<any[]>("/api/skills"),
        api<any[]>("/api/workflows"),
        api<any[]>("/api/sessions"),
      ]);
    setStatus(nextStatus);
    setTimeline(nextTimeline);
    setArtifacts(nextArtifacts);
    setApprovals(nextApprovals);
    setSkills(nextSkills);
    setWorkflows(nextWorkflows);
    setSessions(nextSessions);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const run = async (label: string, fn: () => Promise<any>) => {
    setBusy(true);
    try {
      const result = await fn();
      if (result.sessionId) setSessionId(result.sessionId);
      setLog((prev) => [`${label}: ${JSON.stringify(result, null, 2)}`, ...prev].slice(0, 8));
    } catch (error) {
      setLog((prev) => [`${label} failed: ${error instanceof Error ? error.message : String(error)}`, ...prev]);
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const latestArtifact = artifacts[0];
  const marketWorkflow = useMemo(() => workflows.find((workflow) => workflow.id === "market.snapshot"), [workflows]);

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand"><span className="pi">π</span><div><strong>Trading Pi</strong><small>Local Trading OS</small></div></div>
        {["Chat", "Market", "Planner", "Portfolio", "Journal", "Review", "Evolution", "Marketplace"].map((item) => (
          <button className="nav" key={item}>{item}</button>
        ))}
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Trading Pi Agent</h1>
            <p>Single-agent runtime, Workflow + Skills, local SQLite, observable execution.</p>
          </div>
          <div className="statusPills">
            <span className={status?.env.openai.configured ? "pill ok" : "pill warn"}><Sparkles size={14}/> AI {status?.env.openai.configured ? "ready" : "missing"}</span>
            <span className="pill"><Database size={14}/> SQLite</span>
            <span className={status?.langfuseConfigured ? "pill ok" : "pill warn"}><Activity size={14}/> Langfuse</span>
          </div>
        </header>

        <section className="grid">
          <div className="panel chat">
            <div className="panelHead"><Bot size={18}/><h2>Chat Workspace</h2></div>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
            <button disabled={busy} onClick={() => run("agent.prompt", () => api("/api/session/message", { method: "POST", body: JSON.stringify({ message, sessionId }) }))}>
              <Play size={16}/> Send to TradingPiAgent
            </button>
            <div className="log">
              {log.map((item, index) => <pre key={index}>{item}</pre>)}
            </div>
          </div>

          <div className="panel tools">
            <div className="panelHead"><LineChart size={18}/><h2>Workflow Controls</h2></div>
            <label>Symbol<input value={symbol} onChange={(event) => setSymbol(event.target.value)} /></label>
            <label>Budget USD<input type="number" value={budget} onChange={(event) => setBudget(Number(event.target.value))} /></label>
            <div className="actions">
              <button disabled={busy || !marketWorkflow} onClick={() => run("market.snapshot", () => api("/api/workflows/market.snapshot/run", { method: "POST", body: JSON.stringify({ input: { symbol }, sessionId }) }))}>
                <LineChart size={16}/> Market Snapshot
              </button>
              <button disabled={busy} onClick={() => run("trade.plan", () => api("/api/workflows/trade.plan/run", { method: "POST", body: JSON.stringify({ input: { symbol, budgetUsd: budget }, sessionId }) }))}>
                <FileText size={16}/> Trade Plan
              </button>
            </div>
            <div className="miniGrid">
              <Metric label="Skills" value={skills.length} />
              <Metric label="Workflows" value={workflows.length} />
              <Metric label="Sessions" value={sessions.length} />
              <Metric label="Artifacts" value={artifacts.length} />
            </div>
          </div>

          <div className="panel artifact">
            <div className="panelHead"><FileText size={18}/><h2>Artifact Viewer</h2></div>
            {latestArtifact ? (
              <div>
                <h3>{latestArtifact.title}</h3>
                <p>{latestArtifact.summary}</p>
                <code>{latestArtifact.path}</code>
              </div>
            ) : <p className="muted">No artifacts yet.</p>}
          </div>
        </section>
      </section>

      <aside className="inspector">
        <div className="panel compact">
          <div className="panelHead"><Shield size={18}/><h2>Risk / Approval</h2></div>
          {approvals.length === 0 ? <p className="muted">No pending approvals.</p> : approvals.slice(0, 5).map((approval) => (
            <div className="row" key={approval.id}><strong>{approval.action}</strong><span>{approval.status}</span></div>
          ))}
        </div>
        <div className="panel timeline">
          <div className="panelHead"><Activity size={18}/><h2>Execution Timeline</h2></div>
          {timeline.slice(0, 18).map((event) => (
            <div className="event" key={event.id}>
              <span className={`dot ${event.status}`}></span>
              <div><strong>{event.title}</strong><small>{event.type} · {event.status}</small></div>
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

createRoot(document.getElementById("root")!).render(<App />);

