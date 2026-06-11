export interface BrowserLayerConfig {
  aioSandboxBaseUrl?: string;
}

export type BrowserAction =
  | "browser.search"
  | "browser.open"
  | "browser.extract"
  | "browser.screenshot"
  | "browser.pdf";

export interface BrowserLayerActionResult {
  status: "completed" | "unavailable" | "failed";
  action: BrowserAction;
  sessionId: string;
  payload: unknown;
  provider: "aio-sandbox" | "playwright";
  observedAt: string;
  contentType?: string;
  content?: string;
  artifactKind?: "markdown" | "html" | "png" | "pdf";
  url?: string;
  reason?: string;
  raw?: unknown;
}
