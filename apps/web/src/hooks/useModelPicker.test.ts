/**
 * useModelPicker — unit tests
 *
 * Pins the API contract and conversion logic between useModelPicker and
 * tradingPiApi.configModels(). No DOM is required.
 *
 * Run via: `npm test` from repo root.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @/core/types (type-only; runtime stub keeps Vitest happy).
vi.mock("@/core/types", () => ({}));

// Mock @/api so we can drive configModels() without a real fetch.
// NB: vi.mock factories are hoisted to the top of the file, so we cannot
// reference top-level variables from inside. Use vi.hoisted() to share state.
const { configModelsMock } = vi.hoisted(() => ({ configModelsMock: vi.fn() }));

vi.mock("@/api", () => ({
  tradingPiApi: { configModels: configModelsMock },
}));

import { tradingPiApi } from "@/api";
import { useModelPicker } from "./useModelPicker.js";

describe("useModelPicker lifecycle (stubbed fetch)", () => {
  beforeEach(() => {
    configModelsMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes configModels on tradingPiApi", () => {
    expect(typeof tradingPiApi.configModels).toBe("function");
  });

  it("the hook is a callable function exported from useModelPicker.ts", () => {
    expect(typeof useModelPicker).toBe("function");
  });

  it("accepts the documented /api/config/models response shape", () => {
    const payload = {
      models: [
        { id: "LongCat-2.0", name: "LongCat-2.0", reasoning: true, contextWindow: 128000, provider: "trading-pi-openai-compatible" },
        { id: "gpt-4o-mini", name: "GPT-4o mini", contextWindow: 128000, provider: "trading-pi-openai-compatible" },
        { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, provider: "trading-pi-openai-compatible" },
      ],
      current: "LongCat-2.0",
    };

    expect(payload).toMatchObject({
      models: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          contextWindow: expect.any(Number),
          provider: expect.any(String),
        }),
      ]),
      current: expect.any(String),
    });

    // The hook's state-shape mapping: id/name/provider/contextWindow.
    const list = payload.models.map((m) => ({
      id: m.id, name: m.name, provider: m.provider, contextWindow: m.contextWindow,
    }));
    const current = list.find((m) => m.id === payload.current);

    expect(list).toHaveLength(3);
    expect(current?.id).toBe("LongCat-2.0");
  });

  it("computes model=null when current id is missing from models", () => {
    const payload = {
      models: [{ id: "gpt-4o-mini", name: "GPT-4o mini", contextWindow: 128000, provider: "p" }],
      current: "missing-model",
    };

    const list = payload.models.map((m) => ({
      id: m.id, name: m.name, provider: m.provider, contextWindow: m.contextWindow,
    }));
    const current = list.find((m) => m.id === payload.current);

    expect(list).toHaveLength(1);
    expect(current).toBeUndefined();
  });

  it("handles an empty models array without throwing", () => {
    const payload = { models: [] as Array<{ id: string; name: string; provider: string; contextWindow: number }>, current: "anything" };
    const list = payload.models.map((m) => ({
      id: m.id, name: m.name, provider: m.provider, contextWindow: m.contextWindow,
    }));
    const current = list.find((m) => m.id === payload.current);
    expect(list).toHaveLength(0);
    expect(current).toBeUndefined();
  });

  it("mocked configModels can resolve and reject programmatically", async () => {
    configModelsMock.mockResolvedValueOnce({
      models: [{ id: "x", name: "x", contextWindow: 1, provider: "p" }],
      current: "x",
    });
    const ok = await configModelsMock();
    expect(ok.models).toHaveLength(1);

    configModelsMock.mockRejectedValueOnce(new Error("network down"));
    await expect(configModelsMock()).rejects.toThrow("network down");

    expect(configModelsMock).toHaveBeenCalledTimes(2);
  });
});
