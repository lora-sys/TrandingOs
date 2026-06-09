export interface BrowserLayerConfig {
  aioSandboxBaseUrl?: string;
}

export class AioSandboxBrowserLayer {
  constructor(private readonly config: BrowserLayerConfig = {}) {}

  health() {
    return {
      configured: Boolean(this.config.aioSandboxBaseUrl),
      baseUrl: this.config.aioSandboxBaseUrl ?? null,
      provider: "aio-sandbox",
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

  private async call(action: string, payload: unknown) {
    if (!this.config.aioSandboxBaseUrl) {
      return { status: "unavailable", action, payload, reason: "AIO Sandbox is not configured." };
    }
    const response = await fetch(`${this.config.aioSandboxBaseUrl.replace(/\/$/, "")}/api/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    if (!response.ok) throw new Error(`AIO Sandbox ${action} failed: ${response.status} ${await response.text()}`);
    return response.json();
  }
}
