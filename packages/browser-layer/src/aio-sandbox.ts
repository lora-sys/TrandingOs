import type { BrowserAction, BrowserLayerActionResult } from "./types.js";

/**
 * Adapter for the AIO Sandbox browser service.
 *
 * Uses the Sandbox's HTTP API for basic operations (navigate, screenshot)
 * and falls back to CDP (via Playwright) for content extraction / PDF when
 * a CDP WebSocket URL is advertised by the Sandbox.
 */
export class AioSandboxAdapter {
  private cdpUrl: string | null | undefined; // null = checked, undefined = not yet

  constructor(private readonly baseUrl: string) {}

  // ---------------------------------------------------------------------------
  // Health / discovery
  // ---------------------------------------------------------------------------

  async health(): Promise<{
    configured: boolean;
    baseUrl: string;
    cdpAvailable: boolean;
    provider: "aio-sandbox";
  }> {
    const cdpUrl = await this.resolveCdpUrl();
    return {
      configured: true,
      baseUrl: this.baseUrl,
      cdpAvailable: cdpUrl !== null,
      provider: "aio-sandbox",
    };
  }

  // ---------------------------------------------------------------------------
  // Page navigation (HTTP API)
  // ---------------------------------------------------------------------------

  async navigate(url: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/v1/browser/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "navigate", url }),
    });
    if (!res.ok) {
      throw new Error(
        `AIO Sandbox navigate failed: ${res.status} ${await res.text().catch(() => "")}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Screenshot (HTTP API returns raw PNG)
  // ---------------------------------------------------------------------------

  async screenshot(url: string): Promise<{ content: string; metadata: Record<string, unknown> }> {
    const buf = await this.tryCdpScreenshot(url);
    if (buf) {
      return { content: buf, metadata: { url } };
    }

    // Fallback: HTTP API
    await this.navigate(url);
    const res = await fetch(`${this.baseUrl}/v1/browser/screenshot`);
    if (!res.ok) {
      throw new Error(`AIO Sandbox screenshot failed: ${res.status}`);
    }
    const raw = await res.arrayBuffer();
    return { content: Buffer.from(raw).toString("base64"), metadata: { url } };
  }

  // ---------------------------------------------------------------------------
  // Content extraction (requires CDP – we need to evaluate JS)
  // ---------------------------------------------------------------------------

  async extract(
    url: string,
  ): Promise<{ content: string; metadata: Record<string, unknown> }> {
    const cdpUrl = await this.resolveCdpUrl();
    if (!cdpUrl) {
      throw new Error("AIO Sandbox CDP not available – cannot extract page content");
    }
    return this.withCdpPage(cdpUrl, url, async (page) => {
      const title = await page.title();
      const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
      return { content: bodyText, metadata: { title, url } };
    });
  }

  // ---------------------------------------------------------------------------
  // PDF generation (requires CDP)
  // ---------------------------------------------------------------------------

  async pdf(
    url: string,
  ): Promise<{ content: string; metadata: Record<string, unknown> }> {
    const cdpUrl = await this.resolveCdpUrl();
    if (!cdpUrl) {
      throw new Error("AIO Sandbox CDP not available – cannot generate PDF");
    }
    return this.withCdpPage(cdpUrl, url, async (page) => {
      const pdfResult = await page.pdf({ format: "A4" });
      const buf = Buffer.isBuffer(pdfResult) ? pdfResult : Buffer.from(pdfResult);
      const title = await page.title();
      return { content: buf.toString("base64"), metadata: { title, url } };
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async resolveCdpUrl(): Promise<string | null> {
    if (this.cdpUrl !== undefined) return this.cdpUrl;
    try {
      const res = await fetch(`${this.baseUrl}/v1/browser/info`);
      if (!res.ok) {
        this.cdpUrl = null;
        return null;
      }
      const info = (await res.json()) as { cdpUrl?: string };
      this.cdpUrl = info.cdpUrl ?? null;
    } catch {
      this.cdpUrl = null;
    }
    return this.cdpUrl;
  }

  private async tryCdpScreenshot(url: string): Promise<string | null> {
    const cdpUrl = await this.resolveCdpUrl();
    if (!cdpUrl) return null;
    try {
      return await this.withCdpPage(cdpUrl, url, async (page) => {
        const screenshotBuf = await page.screenshot({ type: "png" });
        const buf = Buffer.isBuffer(screenshotBuf) ? screenshotBuf : Buffer.from(screenshotBuf);
        return buf.toString("base64");
      });
    } catch {
      return null;
    }
  }

  /** Open a CDP-connected page, run `fn`, then close the page. */
  private async withCdpPage<T>(
    cdpUrl: string,
    targetUrl: string,
    fn: (
      page: {
        goto(u: string, opts?: unknown): Promise<unknown>;
        title(): Promise<string>;
        content(): Promise<string>;
        evaluate(fn: string | (() => unknown)): Promise<any>;
        screenshot(opts: { type: "png" }): Promise<Buffer>;
        pdf(opts?: { format?: string }): Promise<Buffer>;
        close(): Promise<void>;
      },
      pw: { chromium: typeof import("playwright").chromium },
    ) => Promise<T>,
  ): Promise<T> {
    const { chromium } = await (import("playwright") as Promise<
      typeof import("playwright")
    >);
    const browser = await chromium.connectOverCDP(cdpUrl);
    const page = await browser.newPage();
    try {
      await page.goto(targetUrl, { waitUntil: "networkidle" });
      return await fn(page as never, { chromium } as never);
    } finally {
      await page.close().catch(() => {});
    }
  }
}