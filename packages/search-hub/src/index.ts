export type SearchProvider = "exa" | "tavily" | "jina" | "free";

export interface SearchHubConfig {
  exaApiKey?: string;
  tavilyApiKey?: string;
  jinaApiKey?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  provider: SearchProvider;
}

export class SearchHub {
  constructor(private readonly config: SearchHubConfig = {}) {}

  async query(input: { query: string; limit?: number; providers?: SearchProvider[] }) {
    const provider = this.selectProvider(input.providers);
    if (provider === "exa") return this.exa(input.query, input.limit ?? 5);
    if (provider === "jina") return this.jina(input.query, input.limit ?? 5);
    return {
      provider,
      status: "unavailable",
      results: [] as SearchResult[],
      reason: `${provider} search is not configured. Set provider API keys to enable live search.`,
    };
  }

  async extract(input: { url: string }) {
    if (!this.config.jinaApiKey) {
      return { status: "unavailable", url: input.url, content: "", reason: "Jina extraction is not configured." };
    }
    const response = await fetch(`https://r.jina.ai/http://${input.url.replace(/^https?:\/\//, "")}`);
    return { status: "completed", url: input.url, content: await response.text() };
  }

  summarize(input: { content: string; maxChars?: number }) {
    const maxChars = input.maxChars ?? 1200;
    return { summary: input.content.slice(0, maxChars), truncated: input.content.length > maxChars };
  }

  private selectProvider(providers?: SearchProvider[]) {
    const order = providers ?? ["free", "exa", "jina", "tavily"];
    if (order.includes("exa") && this.config.exaApiKey) return "exa";
    if (order.includes("jina") && this.config.jinaApiKey) return "jina";
    if (order.includes("tavily") && this.config.tavilyApiKey) return "tavily";
    return order[0] ?? "free";
  }

  private async exa(query: string, limit: number) {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": this.config.exaApiKey ?? "" },
      body: JSON.stringify({ query, numResults: limit }),
    });
    if (!response.ok) throw new Error(`Exa search failed: ${response.status} ${await response.text()}`);
    const json = await response.json() as { results?: Array<{ title?: string; url?: string; text?: string }> };
    return {
      provider: "exa" as const,
      status: "completed",
      results: (json.results ?? []).map((item) => ({
        title: item.title ?? item.url ?? "Untitled",
        url: item.url ?? "",
        snippet: item.text ?? "",
        provider: "exa" as const,
      })),
    };
  }

  private async jina(query: string, limit: number) {
    const url = new URL("https://s.jina.ai/");
    url.searchParams.set("q", query);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Jina search failed: ${response.status} ${await response.text()}`);
    const text = await response.text();
    return {
      provider: "jina" as const,
      status: "completed",
      results: text
        .split(/\n{2,}/)
        .filter(Boolean)
        .slice(0, limit)
        .map((block) => ({ title: block.split("\n")[0] ?? "Jina Result", url: "", snippet: block, provider: "jina" as const })),
    };
  }
}
