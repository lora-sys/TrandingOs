export interface StrategyDefinition {
  id?: string;
  name: string;
  version?: string;
  parameters: Record<string, string | number | boolean>;
  status?: "draft" | "testing" | "verified" | "deprecated";
}

export function scoreStrategy(input: { winRate?: number; rewardRisk?: number; disciplineScore?: number }) {
  const winRate = input.winRate ?? 0;
  const rewardRisk = Math.min(input.rewardRisk ?? 0, 5) / 5;
  const discipline = (input.disciplineScore ?? 0) / 100;
  return Math.round((winRate * 0.4 + rewardRisk * 0.35 + discipline * 0.25) * 100);
}
