import { loadEnv, resolveLocalPaths, type TradingPiEnv, type LocalPaths } from "@trading-pi/core";
import { TradingPiDatabase } from "@trading-pi/core";
import { Repositories } from "@trading-pi/core";
import { SessionStore } from "@trading-pi/core";
import { MemoryStore } from "@trading-pi/core";
import { ArtifactEngine } from "@trading-pi/core";
import { ApprovalEngine } from "@trading-pi/core";
import { SkillRegistry } from "@trading-pi/core";
import { registerDefaultSkills } from "@trading-pi/core";
import { WorkflowEngine } from "@trading-pi/core";
import { registerDefaultWorkflows } from "@trading-pi/core";
import { TradingPiAgent } from "@trading-pi/core";
import { LangfuseTelemetry } from "@trading-pi/core";

export interface Runtime {
  env: TradingPiEnv;
  envStatus: Record<string, unknown>;
  paths: LocalPaths;
  db: TradingPiDatabase;
  repos: Repositories;
  sessions: SessionStore;
  memory: MemoryStore;
  artifacts: ArtifactEngine;
  approvals: ApprovalEngine;
  skills: SkillRegistry;
  workflows: WorkflowEngine;
  agent: TradingPiAgent;
  telemetry: LangfuseTelemetry;
  aiPing: () => Promise<{ text: string; usage?: unknown; stopReason?: string }>;
  workflowContext: (sessionId: string) => any;
}

let runtimeInstance: Runtime | null = null;

export function createRuntime(): Runtime {
  if (runtimeInstance) return runtimeInstance;

  const env = loadEnv();
  const paths = resolveLocalPaths(env);
  const db = new TradingPiDatabase(paths.sqlitePath);
  db.migrate();
  const repos = new Repositories(db);
  const telemetry = new LangfuseTelemetry(env);
  const sessions = new SessionStore(paths, repos);
  const memory = new MemoryStore(repos);
  const artifacts = new ArtifactEngine(paths, repos);
  const approvals = new ApprovalEngine(repos);
  const skills = new (SkillRegistry as any)(repos) as SkillRegistry;
  const workflows = new (WorkflowEngine as any)(skills, repos, artifacts, approvals, memory) as WorkflowEngine;

  registerDefaultSkills(skills);
  registerDefaultWorkflows(workflows, skills);

  const agent = new TradingPiAgent({ sessions, memory, skills, workflows, artifacts, approvals, repos, env });

  runtimeInstance = {
    env,
    envStatus: { node: process.version, platform: process.platform, dataDir: paths.root, openaiModel: env.openaiModel, apiPort: env.apiPort, aioSandboxBaseUrl: env.aioSandboxBaseUrl, langfuseConfigured: telemetry.configured },
    paths,
    db,
    repos,
    sessions,
    memory,
    artifacts,
    approvals,
    skills,
    workflows,
    agent,
    telemetry,
    aiPing: async () => {
      const result = await agent.prompt({ message: "ping" });
      return { text: result.text };
    },
    workflowContext: (sessionId: string) => ({
      env, repos, artifacts, approvals, memory, skills, sessionId,
    }),
  };

  return runtimeInstance;
}

export type { TradingPiEnv };