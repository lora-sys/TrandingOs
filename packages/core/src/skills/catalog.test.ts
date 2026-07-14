import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  ensureLocalPaths,
  Repositories,
  resolveLocalPaths,
  SessionStore,
  SkillRegistry,
  TradingPiDatabase,
  registerDefaultSkills,
  type TradingPiEnv,
} from "../index.js";

/**
 * Contract tests for the skill catalog that backs /api/agent/skills/catalog.
 * Verifies the registry returns the expected shape and counts.
 */

function buildEnv(): TradingPiEnv {
  return {
    openaiApiKey: "sk-test",
    openaiModel: "test",
    dataDir: mkdtempSync(resolve(tmpdir(), "trading-pi-catalog-test-")),
    apiPort: 8787,
    webPort: 5173,
    defaultExchange: "binance",
    exchangeFallbacks: ["okx"],
    tradingMode: "paper",
    thinkingLevel: "medium",
    reasoning: false,
  };
}

describe("SkillRegistry.catalog", () => {
  let registry: SkillRegistry;
  let env: TradingPiEnv;
  let database: TradingPiDatabase;

  beforeAll(() => {
    env = buildEnv();
    database = new TradingPiDatabase(resolve(resolveLocalPaths(env).sqlitePath));
    database.migrate();
    const repos = new Repositories(database);
    // SessionStore not used by catalog tests but constructed for type safety
    void new SessionStore(ensureLocalPaths(resolveLocalPaths(env)), repos);
    registry = new SkillRegistry();
    registerDefaultSkills(registry);
  });

  it("list() returns minimal fields", () => {
    const list = registry.list();
    expect(list.length).toBeGreaterThan(50);
    for (const skill of list.slice(0, 5)) {
      expect(skill.id).toBeTypeOf("string");
      expect(skill.name).toBeTypeOf("string");
      expect(skill.description).toBeTypeOf("string");
      expect(["low", "medium", "high", "critical"]).toContain(skill.riskLevel);
      expect(["read", "write", "dangerous"]).toContain(skill.permission);
    }
  });

  it("catalog() includes parameters schema", () => {
    const catalog = registry.catalog();
    expect(catalog.length).toBe(registry.list().length);
    for (const skill of catalog.slice(0, 5)) {
      expect(skill.id).toBeTypeOf("string");
      // parameters is a TypeBox schema object — must be truthy
      expect(skill.parameters).toBeTruthy();
    }
  });

  it("list and catalog have matching skill IDs", () => {
    const list = registry.list();
    const catalog = registry.catalog();
    const listIds = new Set(list.map((s) => s.id));
    const catalogIds = new Set(catalog.map((s) => s.id));
    expect(listIds).toEqual(catalogIds);
  });

  it("includes a search skill (semantic search) with read permission", () => {
    const search = registry.list().find((s) => s.id === "search.query");
    expect(search).toBeDefined();
    expect(search?.permission).toBe("read");
    expect(search?.riskLevel).toBe("low");
  });

  it("includes at least one high-risk skill (real-trade)", () => {
    const high = registry.list().filter((s) => s.riskLevel === "high" || s.riskLevel === "critical");
    expect(high.length).toBeGreaterThan(0);
  });
});