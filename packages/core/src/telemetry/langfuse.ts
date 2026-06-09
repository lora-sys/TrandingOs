import { Langfuse } from "langfuse";
import type { TradingPiEnv } from "../config/env.js";

export class LangfuseTelemetry {
  private readonly client?: Langfuse;

  constructor(private readonly env: TradingPiEnv) {
    if (env.langfusePublicKey && env.langfuseSecretKey && env.langfuseHost) {
      this.client = new Langfuse({
        publicKey: env.langfusePublicKey,
        secretKey: env.langfuseSecretKey,
        baseUrl: env.langfuseHost,
        flushAt: 1,
      });
    }
  }

  get configured() {
    return Boolean(this.client);
  }

  trace(name: string, metadata?: Record<string, unknown>) {
    if (!this.client) return undefined;
    return this.client.trace({
      name,
      metadata,
      sessionId: metadata?.sessionId ? String(metadata.sessionId) : undefined,
    });
  }

  async flush() {
    await this.client?.flushAsync();
  }
}

