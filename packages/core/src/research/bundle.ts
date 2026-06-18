export type ResearchSourceKind = "market" | "search" | "browser" | "onchain" | "document" | "memory";

export interface ResearchSource {
  kind: ResearchSourceKind;
  provider: string;
  status: "completed" | "unavailable" | "failed" | "cached";
  title: string;
  url?: string;
  reason?: string;
  payload?: unknown;
}

export interface ResearchBundle {
  symbol: string;
  workspaceId?: string;
  sources: ResearchSource[];
  marketSnapshot?: unknown;
  memoryContext?: string;
  generatedAt: string;
}

export function researchQueryFor(symbol: string) {
  return `${symbol} crypto market news catalyst risk onchain macro`;
}

export function sourceQuality(sources: ResearchSource[]) {
  const completed = sources.filter((source) => source.status === "completed" || source.status === "cached").length;
  const failed = sources.filter((source) => source.status === "failed").length;
  const unavailable = sources.filter((source) => source.status === "unavailable").length;
  const score = sources.length ? Math.round((completed / sources.length) * 100) : 0;
  return { total: sources.length, completed, failed, unavailable, score };
}

export function buildResearchBundle(input: {
  symbol: string;
  workspaceId?: string;
  marketSnapshot?: unknown;
  searchResult?: any;
  browserResult?: any;
  memoryContext?: string;
}): ResearchBundle & { sourceQuality: ReturnType<typeof sourceQuality> } {
  const sources: ResearchSource[] = [
    {
      kind: "market",
      provider: "market-data-layer",
      status: input.marketSnapshot ? "completed" : "unavailable",
      title: `${input.symbol} market snapshot`,
      payload: input.marketSnapshot,
    },
    {
      kind: "search",
      provider: input.searchResult?.provider ?? "search-hub",
      status: input.searchResult?.cached ? "cached" : input.searchResult?.status ?? "unavailable",
      title: `${input.symbol} search context`,
      reason: input.searchResult?.reason,
      payload: input.searchResult,
    },
    {
      kind: "browser",
      provider: "aio-sandbox",
      status: input.browserResult?.status ?? "unavailable",
      title: `${input.symbol} browser evidence`,
      reason: input.browserResult?.reason,
      payload: input.browserResult,
    },
    {
      kind: "memory",
      provider: "memory-engine",
      status: input.memoryContext ? "completed" : "unavailable",
      title: `${input.symbol} workspace memory`,
      payload: input.memoryContext,
    },
  ];
  return {
    symbol: input.symbol,
    workspaceId: input.workspaceId,
    sources,
    marketSnapshot: input.marketSnapshot,
    memoryContext: input.memoryContext,
    generatedAt: new Date().toISOString(),
    sourceQuality: sourceQuality(sources),
  };
}
