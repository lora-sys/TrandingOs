import type { ArtifactEngine } from "../artifacts/artifact-engine.js";
import type { Repositories } from "../db/repositories.js";
import type { TradingPiEnv } from "../config/env.js";
import type { MemoryStore } from "../memory/memory-store.js";
import type { ApprovalEngine } from "../approvals/approval-engine.js";
import type { SkillRegistry } from "../skills/registry.js";

export interface ResearchFinding {
  title: string;
  description: string;
  evidence: string;
  source: string;
  relevance: "high" | "medium" | "low";
}

export interface ResearchReport {
  id: string;
  workspaceId: string;
  topic: string;
  generatedAt: string;
  mode: "builtin";
  iterationsUsed: number;
  executionSummary: string;
  keyFindings: ResearchFinding[];
  dataSourceSummary: Array<{ source: string; count: number; keyInsights: string[] }>;
  conclusion: string;
  toolsUsed: string[];
  urlsAccessed: string[];
  tokenUsage: { input: number; output: number };
}

export interface DeepResearchEvent {
  type: "research:started" | "research:step" | "research:complete" | "research:error";
  data: Record<string, unknown>;
}

export interface DeepResearchContext {
  env: TradingPiEnv;
  repos: Repositories;
  artifacts: ArtifactEngine;
  approvals: ApprovalEngine;
  memory: MemoryStore;
  skills: SkillRegistry;
  sessionId?: string;
  workflowRunId?: string;
}

export async function runDeepResearch(
  input: { topic: string; workspaceId: string; maxIterations?: number; context?: string },
  context: DeepResearchContext,
  options: { signal?: AbortSignal; onEvent?: (event: DeepResearchEvent) => void | Promise<void> } = {},
) {
  const totalSteps = 7;
  const maxIterations = Math.min(Math.max(input.maxIterations ?? 5, 3), 10);
  const session = context.repos.createResearchSession({ workspaceId: input.workspaceId, topic: input.topic, totalIterations: totalSteps });
  const emit = async (event: DeepResearchEvent) => {
    await options.onEvent?.(event);
  };
  const step = async (stepNumber: number, stepName: string, detail: string, extra: Record<string, unknown> = {}) => {
    throwIfAborted(options.signal);
    context.repos.updateResearchSession(session.id, { completedIterations: Math.max(0, stepNumber - 1), totalIterations: totalSteps });
    await emit({
      type: "research:step",
      data: { sessionId: session.id, stepName, stepNumber, totalSteps, detail, ...extra },
    });
  };

  try {
    await emit({ type: "research:started", data: { sessionId: session.id, topic: input.topic, mode: "builtin", estimatedSteps: totalSteps } });

    await step(1, "Decompose research question", `Generated sub-questions for ${input.topic}.`, { toolName: "builtin.planner" });
    const subQuestions = decomposeTopic(input.topic, input.context).slice(0, maxIterations);

    await step(2, "Search web news and analysis", `Searching ${subQuestions.length} web/news angles.`, {
      toolName: "search.query",
      inputPreview: subQuestions.join(" | "),
    });
    const web = await safeSkill(context, "search.query", { query: `${input.topic} latest news analysis prediction market`, limit: 8 });

    await step(3, "Search academic sources", "Searching Semantic Scholar and Crossref.", {
      toolName: "academic.semanticscholar academic.crossref",
      inputPreview: input.topic,
    });
    const [semanticScholar, crossref, openalex] = await Promise.all([
      safeSkill(context, "academic.semanticscholar", { method: "search", query: input.topic, limit: 8 }),
      safeSkill(context, "academic.crossref", { method: "search", query: input.topic, rows: 5 }),
      safeSkill(context, "academic.openalex", { method: "search", query: input.topic, perPage: 5 }),
    ]);

    await step(4, "Search community sentiment", "Searching Reddit community discussions.", { toolName: "community.reddit", inputPreview: input.topic });
    const reddit = await safeSkill(context, "community.reddit", { method: "search", query: input.topic, limit: 8 });

    await step(5, "Fetch market data", "Fetching Polymarket and crypto market context when available.", {
      toolName: "market.polymarket.search market.coingecko.quote",
      inputPreview: input.topic,
    });
    const [polymarket, coingecko] = await Promise.all([
      safeSkill(context, "market.polymarket.search", { query: input.topic, limit: 8 }),
      safeSkill(context, "market.coingecko.quote", { symbol: inferSymbol(input.topic) }),
    ]);

    await step(6, "Analyze cross-references", "Cross-referencing web, academic, community, and market evidence.", { toolName: "builtin.analyzer" });
    const observedContext = { web, semanticScholar, crossref, openalex, reddit, polymarket, coingecko };
    const findings = buildFindings(input.topic, observedContext);

    await step(7, "Synthesize report", "Generating structured ResearchReport artifact.", { toolName: context.env.openaiApiKey ? "ai.respond" : "builtin.synthesizer" });
    const report = await synthesizeReport(input, context, observedContext, findings, maxIterations);
    const markdown = reportToMarkdown(report);
    const artifact = context.artifacts.create({
      type: "research-report",
      title: `Deep Research ${input.topic}`,
      summary: report.executionSummary.slice(0, 240),
      markdown,
      workspaceId: input.workspaceId,
      contentType: "application/json",
      previewReady: true,
      previewPayload: { kind: "research-report", report },
      sessionId: context.sessionId,
      workflowRunId: context.workflowRunId,
      payload: report,
    });
    const completed = context.repos.updateResearchSession(session.id, {
      status: "completed",
      completedIterations: totalSteps,
      totalIterations: totalSteps,
      reportArtifactId: artifact.id,
      tokenUsage: report.tokenUsage,
    });
    context.memory.write({
      domain: "research",
      workspaceId: input.workspaceId,
      key: `deep-research:${session.id}`,
      value: report.executionSummary.slice(0, 400),
      sourceType: "artifact",
      sourceId: artifact.id,
      importance: 0.82,
      metadata: { topic: input.topic, toolsUsed: report.toolsUsed },
    });
    context.repos.linkWorkspace({ workspaceId: input.workspaceId, kind: "artifact", refId: artifact.id, metadata: { workflow: "deep.research", sessionId: session.id } });
    await emit({ type: "research:complete", data: { session: completed, report, artifact } });
    return { session: completed, report, artifact };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = options.signal?.aborted ? "cancelled" : "failed";
    const failed = context.repos.updateResearchSession(session.id, { status, errorMessage: message });
    await emit({ type: "research:error", data: { session: failed, message } });
    throw error;
  }
}

async function safeSkill(context: DeepResearchContext, skillId: string, input: unknown) {
  try {
    return await context.skills.get(skillId).execute(input as never, context as never);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), skillId };
  }
}

function decomposeTopic(topic: string, context?: string) {
  return [
    `${topic} latest market odds and catalysts`,
    `${topic} recent news and analysis`,
    `${topic} academic or historical evidence`,
    `${topic} community sentiment and counterarguments`,
    `${topic} risk factors invalidation criteria ${context ?? ""}`.trim(),
  ];
}

async function synthesizeReport(
  input: { topic: string; workspaceId: string },
  context: DeepResearchContext,
  observedContext: unknown,
  findings: ResearchFinding[],
  iterationsUsed: number,
): Promise<ResearchReport> {
  const baseReport = baseResearchReport(input, observedContext, findings, iterationsUsed);
  if (!context.env.openaiApiKey) return baseReport;
  const response = await safeSkill(context, "ai.respond", {
    prompt: `Create a JSON ResearchReport for topic "${input.topic}" using this observed context and findings.
Preserve these required keys: executionSummary, keyFindings, dataSourceSummary, conclusion.
Observed context:
${JSON.stringify({ observedContext, findings }).slice(0, 24_000)}`,
    systemPrompt: "You are Trading Pi Deep Research. Return JSON only. Cite uncertainty and counterarguments. Do not give financial advice.",
  });
  const parsed = normalizeAiReport(parseAiReport(response), baseReport);
  return {
    ...baseReport,
    ...parsed,
    id: baseReport.id,
    workspaceId: input.workspaceId,
    topic: input.topic,
    mode: "builtin",
    generatedAt: baseReport.generatedAt,
    iterationsUsed,
    tokenUsage: extractUsage(response) ?? baseReport.tokenUsage,
  };
}

function baseResearchReport(input: { topic: string; workspaceId: string }, observedContext: unknown, findings: ResearchFinding[], iterationsUsed: number): ResearchReport {
  const toolsUsed = ["search.query", "academic.semanticscholar", "academic.crossref", "academic.openalex", "community.reddit", "market.polymarket.search", "market.coingecko.quote"];
  const urlsAccessed = collectUrls(observedContext);
  return {
    id: `rr_${Date.now()}`,
    workspaceId: input.workspaceId,
    topic: input.topic,
    generatedAt: new Date().toISOString(),
    mode: "builtin",
    iterationsUsed,
    executionSummary: `Deep Research analyzed ${input.topic} across web search, academic sources, Reddit community context, and market data. ${urlsAccessed.length} source URLs were identified.`,
    keyFindings: findings,
    dataSourceSummary: summarizeSources(observedContext),
    conclusion: `Evidence for ${input.topic} is mixed. Treat this report as research context, then generate a Decision Card and apply risk rules before any paper trade.`,
    toolsUsed,
    urlsAccessed,
    tokenUsage: { input: 0, output: 0 },
  };
}

function buildFindings(topic: string, observedContext: any): ResearchFinding[] {
  const findings: ResearchFinding[] = [];
  const marketCount = Array.isArray(observedContext.polymarket?.markets) ? observedContext.polymarket.markets.length : 0;
  findings.push({
    title: "Market context collected",
    description: marketCount ? `${marketCount} related Polymarket markets were found for the topic.` : "Market lookup completed, but no directly related Polymarket market was confirmed.",
    evidence: marketCount ? observedContext.polymarket.markets[0]?.question ?? topic : observedContext.polymarket?.error ?? "No direct market match.",
    source: "Polymarket",
    relevance: marketCount ? "high" : "medium",
  });
  const paperCount = Array.isArray(observedContext.semanticScholar?.papers) ? observedContext.semanticScholar.papers.length : 0;
  findings.push({
    title: "Academic context checked",
    description: paperCount ? `${paperCount} Semantic Scholar papers were found.` : "Academic lookup completed with sparse direct coverage.",
    evidence: paperCount ? observedContext.semanticScholar.papers[0]?.title ?? "Academic result available" : observedContext.semanticScholar?.error ?? "No direct paper match.",
    source: "Semantic Scholar",
    relevance: paperCount ? "medium" : "low",
  });
  const redditCount = Array.isArray(observedContext.reddit?.posts) ? observedContext.reddit.posts.length : 0;
  findings.push({
    title: "Community sentiment sampled",
    description: redditCount ? `${redditCount} Reddit discussions were sampled.` : "Community lookup completed with limited direct discussion.",
    evidence: redditCount ? observedContext.reddit.posts[0]?.title ?? "Reddit result available" : observedContext.reddit?.error ?? "No direct community match.",
    source: "Reddit",
    relevance: redditCount ? "medium" : "low",
  });
  return findings;
}

function summarizeSources(observedContext: any) {
  return [
    { source: "Web Search", count: countRows(observedContext.web?.results), keyInsights: firstTitles(observedContext.web?.results) },
    { source: "Semantic Scholar", count: countRows(observedContext.semanticScholar?.papers), keyInsights: firstTitles(observedContext.semanticScholar?.papers) },
    { source: "Crossref", count: countRows(observedContext.crossref?.works), keyInsights: firstTitles(observedContext.crossref?.works) },
    { source: "OpenAlex", count: countRows(observedContext.openalex?.works), keyInsights: firstTitles(observedContext.openalex?.works) },
    { source: "Reddit", count: countRows(observedContext.reddit?.posts), keyInsights: firstTitles(observedContext.reddit?.posts) },
    { source: "Polymarket", count: countRows(observedContext.polymarket?.markets), keyInsights: firstTitles(observedContext.polymarket?.markets, "question") },
  ];
}

function reportToMarkdown(report: ResearchReport) {
  const keyFindings = normalizeFindings(report.keyFindings, []);
  const dataSourceSummary = normalizeDataSourceSummary(report.dataSourceSummary, []);
  return `# ${report.topic}

## Execution Summary

${report.executionSummary}

## Key Findings

${keyFindings
  .map((finding, index) => `### ${index + 1}. ${finding.title}\n\n${finding.description}\n\nEvidence: ${finding.evidence}\n\nSource: ${finding.source}\n\nRelevance: ${finding.relevance}`)
  .join("\n\n")}

## Data Sources

${dataSourceSummary.map((source) => `- ${source.source}: ${source.count} results${source.keyInsights.length ? ` — ${source.keyInsights.join("; ")}` : ""}`).join("\n")}

## Conclusion

${report.conclusion}
`;
}

function parseAiReport(response: unknown) {
  const text = typeof (response as { text?: unknown })?.text === "string" ? String((response as { text: string }).text) : "";
  const jsonText = text.match(/```json\s*([\s\S]*?)```/)?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0] ?? "";
  if (!jsonText) return {};
  try {
    return JSON.parse(jsonText) as Partial<ResearchReport>;
  } catch {
    return {};
  }
}

function normalizeAiReport(parsed: Partial<ResearchReport>, fallback: ResearchReport): Partial<ResearchReport> {
  return {
    executionSummary: typeof parsed.executionSummary === "string" && parsed.executionSummary.trim() ? parsed.executionSummary : fallback.executionSummary,
    keyFindings: normalizeFindings(parsed.keyFindings, fallback.keyFindings),
    dataSourceSummary: normalizeDataSourceSummary(parsed.dataSourceSummary, fallback.dataSourceSummary),
    conclusion: typeof parsed.conclusion === "string" && parsed.conclusion.trim() ? parsed.conclusion : fallback.conclusion,
  };
}

function normalizeFindings(value: unknown, fallback: ResearchFinding[]): ResearchFinding[] {
  if (!Array.isArray(value)) return fallback;
  const findings = value
    .map((item: any, index) => ({
      title: String(item?.title ?? `Finding ${index + 1}`).trim(),
      description: String(item?.description ?? item?.summary ?? item?.evidence ?? "").trim(),
      evidence: String(item?.evidence ?? item?.description ?? "Evidence summarized by AI.").trim(),
      source: String(item?.source ?? "AI synthesis").trim(),
      relevance: normalizeRelevance(item?.relevance),
    }))
    .filter((item) => item.title && item.description);
  return findings.length ? findings : fallback;
}

function normalizeDataSourceSummary(
  value: unknown,
  fallback: Array<{ source: string; count: number; keyInsights: string[] }>,
): Array<{ source: string; count: number; keyInsights: string[] }> {
  const sourceRows = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.entries(value).map(([source, details]) => ({ source, ...(details && typeof details === "object" ? details : { keyInsights: [String(details)] }) }))
      : [];
  const rows = sourceRows
    .map((item: any) => ({
      source: String(item?.source ?? item?.name ?? "AI synthesis").trim(),
      count: Number.isFinite(Number(item?.count)) ? Number(item.count) : 0,
      keyInsights: normalizeInsightList(item?.keyInsights ?? item?.insights ?? item?.summary),
    }))
    .filter((item) => item.source);
  return rows.length ? rows : fallback;
}

function normalizeInsightList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 5);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeRelevance(value: unknown): ResearchFinding["relevance"] {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function extractUsage(response: unknown): { input: number; output: number } | undefined {
  const usage = (response as { usage?: { input?: number; output?: number; inputTokens?: number; outputTokens?: number; promptTokens?: number; completionTokens?: number } })?.usage;
  if (!usage) return undefined;
  return {
    input: usage.input ?? usage.inputTokens ?? usage.promptTokens ?? 0,
    output: usage.output ?? usage.outputTokens ?? usage.completionTokens ?? 0,
  };
}

function collectUrls(value: unknown): string[] {
  const urls = new Set<string>();
  JSON.stringify(value, (_key, current) => {
    if (typeof current === "string" && current.startsWith("http")) urls.add(current);
    return current;
  });
  return [...urls].slice(0, 50);
}

function countRows(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function firstTitles(value: unknown, key = "title") {
  return Array.isArray(value)
    ? value
        .slice(0, 3)
        .map((entry) => String((entry as Record<string, unknown>)[key] ?? (entry as Record<string, unknown>).title ?? ""))
        .filter(Boolean)
    : [];
}

function inferSymbol(topic: string) {
  const upper = topic.toUpperCase();
  if (upper.includes("BTC") || upper.includes("BITCOIN")) return "BTC";
  if (upper.includes("SOL") || upper.includes("SOLANA")) return "SOL";
  if (upper.includes("ETH") || upper.includes("ETHEREUM")) return "ETH";
  return "ETH";
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error("Deep Research cancelled");
}
