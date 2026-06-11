import { createServerFn } from "@tanstack/react-start";
import { createRuntime } from "../runtime.js";

export const browserSearch = createServerFn({ method: "POST" })
  .validator((input: { query: string; sessionId?: string }) => input)
  .handler(async ({ data }) => {
    const { AioSandboxBrowserLayer } = await import("@trading-pi/browser-layer");
    const browser = new AioSandboxBrowserLayer({});
    const result = await browser.search(data.query);
    return { status: result.status, action: result.action, sessionId: result.sessionId, provider: result.provider, content: result.content, artifactKind: result.artifactKind, reason: result.reason, observedAt: result.observedAt };
  });

export const browserScreenshot = createServerFn({ method: "POST" })
  .validator((input: { url: string; sessionId?: string }) => input)
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const { AioSandboxBrowserLayer } = await import("@trading-pi/browser-layer");
    const browser = new AioSandboxBrowserLayer({});
    const result = await browser.screenshot(data.url);
    return { status: result.status, action: result.action, sessionId: result.sessionId, provider: result.provider, content: result.content, artifactKind: result.artifactKind, reason: result.reason, observedAt: result.observedAt };
  });

export const browserExtract = createServerFn({ method: "POST" })
  .validator((input: { url: string; sessionId?: string }) => input)
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    const session = runtime.sessions.ensureSession(data.sessionId);
    const { AioSandboxBrowserLayer } = await import("@trading-pi/browser-layer");
    const browser = new AioSandboxBrowserLayer({ aioSandboxBaseUrl: runtime.env.aioSandboxBaseUrl });
    return browser.extract(data.url) as any;
  });
