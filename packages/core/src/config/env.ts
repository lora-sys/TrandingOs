import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface TradingPiEnv {
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel: string;
  exaApiKey?: string;
  tavilyApiKey?: string;
  jinaApiKey?: string;
  coinMarketCapApiKey?: string;
  fredApiKey?: string;
  coinMarketCalApiKey?: string;
  aioSandboxBaseUrl?: string;
  langfusePublicKey?: string;
  langfuseSecretKey?: string;
  langfuseHost?: string;
  dataDir: string;
  apiPort: number;
  webPort: number;
  defaultExchange: string;
  exchangeFallbacks: string[];
  tradingMode: "mock" | "paper" | "live_guarded";
  thinkingLevel: string;
  reasoning: boolean;
}

function loadDotEnv(cwd = process.cwd()): Record<string, string> {
  const envPath = resolve(cwd, ".env");
  if (!existsSync(envPath)) return {};
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  const parsed: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    parsed[key] = value;
  }
  return parsed;
}

export function loadEnv(cwd = process.env.INIT_CWD ?? process.cwd()): TradingPiEnv {
  const fileEnv = loadDotEnvCascade(cwd);
  const value = (key: string): string | undefined => process.env[key] ?? fileEnv[key];
  return {
    openaiApiKey: value("OPENAI_API_KEY"),
    openaiBaseUrl: value("OPENAI_BASE_URL"),
    openaiModel: value("OPENAI_MODEL") ?? "gpt-4o-mini",
    exaApiKey: value("EXA_API_KEY"),
    tavilyApiKey: value("TAVILY_API_KEY"),
    jinaApiKey: value("JINA_API_KEY"),
    coinMarketCapApiKey: value("COINMARKETCAP_API_KEY"),
    fredApiKey: value("FRED_API_KEY"),
    coinMarketCalApiKey: value("COINMARKETCAL_API_KEY"),
    aioSandboxBaseUrl: value("AIO_SANDBOX_BASE_URL"),
    langfusePublicKey: value("LANGFUSE_PUBLIC_KEY"),
    langfuseSecretKey: value("LANGFUSE_SECRET_KEY"),
    langfuseHost: value("LANGFUSE_HOST"),
    dataDir: value("TRADING_PI_DATA_DIR") ?? ".trading-pi",
    apiPort: Number(value("TRADING_PI_API_PORT") ?? 8787),
    webPort: Number(value("TRADING_PI_WEB_PORT") ?? 5173),
    defaultExchange: value("TRADING_PI_DEFAULT_EXCHANGE") ?? "binance",
    exchangeFallbacks: (value("TRADING_PI_EXCHANGE_FALLBACKS") ?? "okx,bybit,coinbase,kraken")
      .split(",")
      .map((exchange) => exchange.trim())
      .filter(Boolean),
    tradingMode: parseTradingMode(value("TRADING_PI_TRADING_MODE")),
    thinkingLevel: value("TRADING_PI_THINKING_LEVEL") ?? "medium",
    reasoning: value("OPENAI_REASONING") === "true",
  };
}

function loadDotEnvCascade(cwd: string): Record<string, string> {
  const coreRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const repoRoot = resolve(coreRoot, "../..");
  const candidates = [
    cwd,
    process.cwd(),
    resolve(cwd, "apps/web"),
    resolve(process.cwd(), "apps/web"),
    repoRoot,
    resolve(repoRoot, "apps/web"),
  ];
  const merged: Record<string, string> = {};
  for (const candidate of unique(candidates)) {
    Object.assign(merged, loadDotEnv(candidate));
  }
  return merged;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => resolve(value)))];
}

export function redactedEnv(env: TradingPiEnv) {
  return {
    openai: {
      configured: Boolean(env.openaiApiKey),
      baseUrl: env.openaiBaseUrl ?? null,
      model: env.openaiModel,
    },
    langfuse: {
      configured: Boolean(env.langfusePublicKey && env.langfuseSecretKey && env.langfuseHost),
      host: env.langfuseHost ?? null,
    },
    integrations: {
      exaConfigured: Boolean(env.exaApiKey),
      tavilyConfigured: Boolean(env.tavilyApiKey),
      jinaConfigured: Boolean(env.jinaApiKey),
      coinMarketCapConfigured: Boolean(env.coinMarketCapApiKey),
      fredConfigured: Boolean(env.fredApiKey),
      coinMarketCalConfigured: Boolean(env.coinMarketCalApiKey),
      aioSandboxConfigured: Boolean(env.aioSandboxBaseUrl),
    },
    local: {
      dataDir: env.dataDir,
      apiPort: env.apiPort,
      webPort: env.webPort,
      defaultExchange: env.defaultExchange,
      exchangeFallbacks: env.exchangeFallbacks,
      tradingMode: env.tradingMode,
      thinkingLevel: env.thinkingLevel,
      reasoning: env.reasoning,
    },
  };
}

function parseTradingMode(value?: string): TradingPiEnv["tradingMode"] {
  if (value === "mock" || value === "paper" || value === "live_guarded") return value;
  return "paper";
}
