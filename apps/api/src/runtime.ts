import {
  aiPing,
  ApprovalEngine,
  ArtifactEngine,
  ensureLocalPaths,
  LangfuseTelemetry,
  loadEnv,
  MemoryStore,
  redactedEnv,
  registerDefaultSkills,
  registerDefaultWorkflows,
  Repositories,
  resolveLocalPaths,
  SessionStore,
  SkillRegistry,
  TradingPiAgent,
  TradingPiDatabase,
  WorkflowEngine,
} from "@trading-pi/core";

export function createRuntime() {
  const env = loadEnv();
  const paths = ensureLocalPaths(resolveLocalPaths(env));
  const database = new TradingPiDatabase(paths.sqlitePath);
  database.migrate();
  const repos = new Repositories(database);
  const artifacts = new ArtifactEngine(paths, repos);
  const approvals = new ApprovalEngine(repos);
  const memory = new MemoryStore(repos);
  const sessions = new SessionStore(paths, repos);
  const skills = new SkillRegistry();
  const workflows = new WorkflowEngine();
  const telemetry = new LangfuseTelemetry(env);
  registerDefaultSkills(skills);
  const baseContext = { env, repos, artifacts, approvals, memory, skills };
  skills.syncToDb(baseContext);
  registerDefaultWorkflows(workflows, skills);
  workflows.syncToDb(baseContext);
  const agent = new TradingPiAgent({ env, repos, sessions, memory, skills, workflows, artifacts, approvals });
  return {
    env,
    envStatus: redactedEnv(env),
    paths,
    database,
    repos,
    artifacts,
    approvals,
    memory,
    sessions,
    skills,
    workflows,
    telemetry,
    agent,
    aiPing: () => aiPing(env),
    workflowContext: (sessionId?: string) => ({ env, repos, artifacts, approvals, memory, skills, sessionId }),
  };
}

export type Runtime = ReturnType<typeof createRuntime>;
