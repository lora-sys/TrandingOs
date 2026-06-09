import { mkdirSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { TradingPiEnv } from "./env.js";

export interface LocalPaths {
  root: string;
  sqlitePath: string;
  artifactsDir: string;
  sessionsDir: string;
  memoryDir: string;
  logsDir: string;
}

export function resolveLocalPaths(env: TradingPiEnv, cwd = process.env.INIT_CWD ?? process.cwd()): LocalPaths {
  const root = isAbsolute(env.dataDir) ? env.dataDir : resolve(cwd, env.dataDir);
  return {
    root,
    sqlitePath: resolve(root, "trading-pi.sqlite"),
    artifactsDir: resolve(root, "artifacts"),
    sessionsDir: resolve(root, "sessions"),
    memoryDir: resolve(root, "memory"),
    logsDir: resolve(root, "logs"),
  };
}

export function ensureLocalPaths(paths: LocalPaths): LocalPaths {
  mkdirSync(paths.root, { recursive: true });
  mkdirSync(paths.artifactsDir, { recursive: true });
  mkdirSync(paths.sessionsDir, { recursive: true });
  mkdirSync(paths.memoryDir, { recursive: true });
  mkdirSync(paths.logsDir, { recursive: true });
  return paths;
}
