import type { TSchema } from "typebox";
import type { SkillContext, TradingSkill } from "./types.js";
import { toPiTool } from "./types.js";

export class SkillRegistry {
  private readonly skills = new Map<string, TradingSkill<any, any>>();

  register<TParameters extends TSchema, TOutput>(skill: TradingSkill<TParameters, TOutput>) {
    this.skills.set(skill.id, skill);
    return skill;
  }

  get(id: string) {
    const skill = this.skills.get(id);
    if (!skill) throw new Error(`Skill not registered: ${id}`);
    return skill;
  }

  list() {
    return [...this.skills.values()].map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      riskLevel: skill.riskLevel,
      permission: skill.permission,
    }));
  }

  /** Full catalog including the TypeBox parameters schema so consumers
   *  can build forms, docs, or auto-completion from the source of truth. */
  catalog() {
    return [...this.skills.values()].map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      riskLevel: skill.riskLevel,
      permission: skill.permission,
      parameters: skill.parameters,
    }));
  }

  syncToDb(context: SkillContext) {
    for (const skill of this.skills.values()) {
      context.repos.upsertSkill({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        riskLevel: skill.riskLevel,
        permission: skill.permission,
      });
    }
  }

  toPiTools(context: SkillContext) {
    return [...this.skills.values()].map((skill) => toPiTool(skill, context));
  }
}

