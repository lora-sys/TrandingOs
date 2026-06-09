export interface BrowserLayerConfig {
  aioSandboxBaseUrl?: string;
}

export type BrowserAction = "browser.search" | "browser.open" | "browser.extract" | "browser.screenshot" | "browser.pdf";

export interface BrowserLayerActionResult {
  status: "completed" | "unavailable" | "failed";
  action: BrowserAction;
  sessionId: string;
  payload: unknown;
  provider: "aio-sandbox";
  observedAt: string;
  contentType?: string;
  content?: string;
  artifactKind?: "markdown" | "html" | "png" | "pdf";
  url?: string;
  reason?: string;
  raw?: unknown;
}

export class AioSandboxBrowserLayer {
  constructor(private readonly config: BrowserLayerConfig = {}) {}

  health() {
    return {
      configured: Boolean(this.config.aioSandboxBaseUrl),
      baseUrl: this.config.aioSandboxBaseUrl ?? null,
      provider: "aio-sandbox",
      capabilities: ["browser.search", "browser.open", "browser.extract", "browser.screenshot", "browser.pdf"],
    };
  }

  async search(query: string) {
    return this.call("browser.search", { query });
  }

  async open(url: string) {
    return this.call("browser.open", { url });
  }

  async extract(url: string) {
    return this.call("browser.extract", { url });
  }

  async screenshot(url: string) {
    return this.call("browser.screenshot", { url });
  }

  async pdf(url: string) {
    return this.call("browser.pdf", { url });
  }

  async action(action: BrowserAction, payload: unknown) {
    return this.call(action, payload);
  }

  private async call(action: BrowserAction, payload: unknown): Promise<BrowserLayerActionResult> {
    const sessionId = `aio_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    if (!this.config.aioSandboxBaseUrl) {
      return {
        status: "unavailable",
        action,
        payload,
        provider: "aio-sandbox",
        sessionId,
        observedAt: new Date().toISOString(),
        reason: "AIO Sandbox is not configured.",
      };
    }
    const response = await fetch(`${this.config.aioSandboxBaseUrl.replace(/\/$/, "")}/api/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload, sessionId }),
    });
    if (!response.ok) throw new Error(`AIO Sandbox ${action} failed: ${response.status} ${await response.text()}`);
    const raw = await response.json();
    return {
      status: "completed",
      action,
      payload,
      provider: "aio-sandbox",
      sessionId: raw.sessionId ?? sessionId,
      observedAt: new Date().toISOString(),
      contentType: raw.contentType,
      content: raw.content,
      artifactKind: inferArtifactKind(action, raw.contentType),
      url: typeof payload === "object" && payload && "url" in payload ? String((payload as { url?: unknown }).url ?? "") : undefined,
      raw,
    };
  }
}

function inferArtifactKind(action: BrowserAction, contentType?: string): BrowserLayerActionResult["artifactKind"] {
  if (action === "browser.screenshot") return "png";
  if (action === "browser.pdf") return "pdf";
  if (contentType?.includes("html")) return "html";
  return "markdown";
}
