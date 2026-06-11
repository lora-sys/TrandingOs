import { AioSandboxAdapter } from "./aio-sandbox.js";
import type { BrowserAction, BrowserLayerActionResult, BrowserLayerConfig } from "./types.js";

export type { BrowserAction, BrowserLayerActionResult, BrowserLayerConfig };

export class AioSandboxBrowserLayer {
  private readonly sandboxAdapter: AioSandboxAdapter | null;

  constructor(private readonly config: BrowserLayerConfig = {}) {
    this.sandboxAdapter = this.resolveBaseUrl()
      ? new AioSandboxAdapter(this.resolveBaseUrl()!)
      : null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  health() {
    const baseUrl = this.resolveBaseUrl();
    return {
      configured: Boolean(baseUrl),
      baseUrl: baseUrl ?? null,
      provider: baseUrl ? ("aio-sandbox" as const) : ("playwright" as const),
      capabilities: [
        "browser.search",
        "browser.open",
        "browser.extract",
        "browser.screenshot",
        "browser.pdf",
      ] as BrowserAction[],
    };
  }

  search(query: string): Promise<BrowserLayerActionResult> {
    return this.call("browser.search", { query });
  }

  open(url: string): Promise<BrowserLayerActionResult> {
    return this.call("browser.open", { url });
  }

  extract(url: string): Promise<BrowserLayerActionResult> {
    return this.call("browser.extract", { url });
  }

  screenshot(url: string): Promise<BrowserLayerActionResult> {
    return this.call("browser.screenshot", { url });
  }

  pdf(url: string): Promise<BrowserLayerActionResult> {
    return this.call("browser.pdf", { url });
  }

  action(action: BrowserAction, payload: unknown): Promise<BrowserLayerActionResult> {
    return this.call(action, payload);
  }

  // ---------------------------------------------------------------------------
  // Internal routing
  // ---------------------------------------------------------------------------

  private resolveBaseUrl(): string | null {
    const raw =
      this.config.aioSandboxBaseUrl ?? process.env.AIO_SANDBOX_BASE_URL ?? null;
    return raw ? raw.replace(/\/+$/, "") : null;
  }

  private extractUrl(payload: unknown): string | undefined {
    if (typeof payload === "object" && payload !== null && "url" in payload) {
      const v = (payload as Record<string, unknown>).url;
      return typeof v === "string" ? v : undefined;
    }
    return undefined;
  }

  private makeResult(
    status: "completed" | "unavailable" | "failed",
    action: BrowserAction,
    sessionId: string,
    payload: unknown,
    provider: "aio-sandbox" | "playwright",
    overrides?: Partial<BrowserLayerActionResult>,
  ): BrowserLayerActionResult {
    return {
      status,
      action,
      sessionId,
      payload,
      provider,
      observedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  private async call(
    action: BrowserAction,
    payload: unknown,
  ): Promise<BrowserLayerActionResult> {
    const sessionId = `br_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const url = this.extractUrl(payload);

    // ---- AIO Sandbox path ---------------------------------------------------
    if (this.sandboxAdapter) {
      try {
        return await this.callAioSandbox(action, payload, sessionId, url);
      } catch (err) {
        return this.makeResult("failed", action, sessionId, payload, "aio-sandbox", {
          url,
          reason: err instanceof Error ? err.message : String(err),
          raw: err,
        });
      }
    }

    // ---- Local Playwright fallback -------------------------------------------
    try {
      return await this.callLocalPlaywright(action, payload, sessionId, url);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return this.makeResult("unavailable", action, sessionId, payload, "playwright", {
        url,
        reason: `Playwright not available: ${reason}`,
        raw: err,
      });
    }
  }

  private async callAioSandbox(
    action: BrowserAction,
    payload: unknown,
    sessionId: string,
    url: string | undefined,
  ): Promise<BrowserLayerActionResult> {
    const adapter = this.sandboxAdapter!;

    switch (action) {
      case "browser.search": {
        const q = (payload as Record<string, unknown>).query;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(String(q ?? ""))}`;
        await adapter.navigate(searchUrl);
        return this.makeResult("completed", action, sessionId, payload, "aio-sandbox", {
          url: searchUrl,
          raw: { navigated: true },
        });
      }

      case "browser.open": {
        if (!url) throw new Error("URL is required for browser.open");
        await adapter.navigate(url);
        return this.makeResult("completed", action, sessionId, payload, "aio-sandbox", {
          url,
          raw: { navigated: true },
        });
      }

      case "browser.extract": {
        if (!url) throw new Error("URL is required for browser.extract");
        const { content, metadata } = await adapter.extract(url);
        return this.makeResult("completed", action, sessionId, payload, "aio-sandbox", {
          url,
          contentType: "text/plain",
          content,
          artifactKind: "markdown",
          raw: metadata,
        });
      }

      case "browser.screenshot": {
        if (!url) throw new Error("URL is required for browser.screenshot");
        const { content, metadata } = await adapter.screenshot(url);
        return this.makeResult("completed", action, sessionId, payload, "aio-sandbox", {
          url,
          contentType: "image/png",
          content,
          artifactKind: "png",
          raw: metadata,
        });
      }

      case "browser.pdf": {
        if (!url) throw new Error("URL is required for browser.pdf");
        const { content, metadata } = await adapter.pdf(url);
        return this.makeResult("completed", action, sessionId, payload, "aio-sandbox", {
          url,
          contentType: "application/pdf",
          content,
          artifactKind: "pdf",
          raw: metadata,
        });
      }
    }
  }

  private async callLocalPlaywright(
    action: BrowserAction,
    payload: unknown,
    sessionId: string,
    url: string | undefined,
  ): Promise<BrowserLayerActionResult> {
    const { chromium } = await (import("playwright") as Promise<
      typeof import("playwright")
    >);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();

      switch (action) {
        case "browser.search": {
          const q = (payload as Record<string, unknown>).query;
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(String(q ?? ""))}`;
          await page.goto(searchUrl, { waitUntil: "networkidle" });
          const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
          return this.makeResult("completed", action, sessionId, payload, "playwright", {
            url: searchUrl,
            contentType: "text/plain",
            content: bodyText,
            artifactKind: "markdown",
          });
        }

        case "browser.open": {
          if (!url) throw new Error("URL is required for browser.open");
          await page.goto(url, { waitUntil: "networkidle" });
          const title = await page.title();
          const content = await page.evaluate(() => document.body?.innerText ?? "");
          return this.makeResult("completed", action, sessionId, payload, "playwright", {
            url,
            contentType: "text/plain",
            content,
            artifactKind: "markdown",
            raw: { title },
          });
        }

        case "browser.extract": {
          if (!url) throw new Error("URL is required for browser.extract");
          await page.goto(url, { waitUntil: "networkidle" });
          const title = await page.title();
          const extracted = await page.evaluate(() => document.body?.innerText ?? "");
          return this.makeResult("completed", action, sessionId, payload, "playwright", {
            url,
            contentType: "text/plain",
            content: extracted,
            artifactKind: "markdown",
            raw: { title },
          });
        }

        case "browser.screenshot": {
          if (!url) throw new Error("URL is required for browser.screenshot");
          await page.goto(url, { waitUntil: "networkidle" });
          const screenshotBuf = await page.screenshot({ type: "png" });
          const buf = Buffer.isBuffer(screenshotBuf)
            ? screenshotBuf
            : Buffer.from(screenshotBuf);
          return this.makeResult("completed", action, sessionId, payload, "playwright", {
            url,
            contentType: "image/png",
            content: buf.toString("base64"),
            artifactKind: "png",
          });
        }

        case "browser.pdf": {
          if (!url) throw new Error("URL is required for browser.pdf");
          await page.goto(url, { waitUntil: "networkidle" });
          const pdfResult = await page.pdf({ format: "A4" });
          const pdfBuf = Buffer.isBuffer(pdfResult)
            ? pdfResult
            : Buffer.from(pdfResult);
          return this.makeResult("completed", action, sessionId, payload, "playwright", {
            url,
            contentType: "application/pdf",
            content: pdfBuf.toString("base64"),
            artifactKind: "pdf",
          });
        }
      }
    } finally {
      await browser.close().catch(() => {});
    }
  }
}