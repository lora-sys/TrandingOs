import { createServerFn } from "@tanstack/react-start";
import { createRuntime } from "../runtime.js";

export const writeMemory = createServerFn({ method: "POST" })
  .validator((input: { scope?: string; key: string; value: string }) => input)
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    runtime.memory.upsert(data.scope ?? "user", data.key, data.value);
    return { ok: true };
  });

export const queryMemory = createServerFn({ method: "POST" })
  .validator((input: { domain?: string; workspaceId?: string; q?: string; limit?: number }) => input)
  .handler(async ({ data }) => {
    const runtime = createRuntime();
    return runtime.memory.query(data as any);
  });

export const getMemoryContext = createServerFn({ method: "GET" })
  .validator((domain: string) => domain)
  .handler(async ({ data: domain }) => {
    const runtime = createRuntime();
    return runtime.memory.contextBlock(domain);
  });

export const listMemory = createServerFn({ method: "GET" }).handler(async () => {
  const runtime = createRuntime();
  return runtime.memory.list("user") as any[];
});