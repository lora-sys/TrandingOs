import type { SkillContext } from "../skills/types.js";
import type { SkillRegistry } from "../skills/registry.js";

export interface WorkflowContext extends SkillContext {
  skills: SkillRegistry;
}

export interface TradingWorkflow<TInput = unknown, TOutput = unknown> {
  id: string;
  name: string;
  description: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  execute(input: TInput, context: WorkflowContext): Promise<TOutput>;
}

