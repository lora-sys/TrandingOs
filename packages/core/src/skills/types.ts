import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { Static, TSchema } from "typebox";
import type { Repositories } from "../db/repositories.js";
import type { ArtifactEngine } from "../artifacts/artifact-engine.js";
import type { ApprovalEngine } from "../approvals/approval-engine.js";
import type { MemoryStore } from "../memory/memory-store.js";
import type { TradingPiEnv } from "../config/env.js";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type PermissionLevel = "read" | "write" | "dangerous";

export interface SkillContext {
  env: TradingPiEnv;
  repos: Repositories;
  artifacts: ArtifactEngine;
  approvals: ApprovalEngine;
  memory: MemoryStore;
  workflowRunId?: string;
  sessionId?: string;
}

export interface TradingSkill<TParameters extends TSchema = TSchema, TOutput = unknown> {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  permission: PermissionLevel;
  parameters: TParameters;
  execute(input: Static<TParameters>, context: SkillContext, signal?: AbortSignal): Promise<TOutput>;
}

export function toPiTool<TParameters extends TSchema>(
  skill: TradingSkill<TParameters>,
  context: SkillContext,
): AgentTool<TParameters, unknown> {
  return {
    name: skill.id,
    label: skill.name,
    description: skill.description,
    parameters: skill.parameters,
    execute: async (_toolCallId, params, signal, onUpdate) => {
      onUpdate?.({
        content: [{ type: "text", text: `${skill.id} started` }],
        details: { status: "running" },
      });
      const details = await skill.execute(params, context, signal);
      return {
        content: [{ type: "text", text: JSON.stringify(details) }],
        details,
      };
    },
  };
}

