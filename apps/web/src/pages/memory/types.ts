import { BrainIcon, MessageSquareIcon, TrendingUpIcon, PenToolIcon, BookOpenIcon, WrenchIcon, FlaskConicalIcon, TargetIcon } from "lucide-react";

export type MemoryDomain = "conversation" | "market" | "trade" | "review" | "skill" | "workspace" | "research" | "strategy" | "user_rules";

export const DOMAIN_META: Record<MemoryDomain, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  conversation: { label: "对话记忆", icon: MessageSquareIcon, color: "text-blue-400" },
  market: { label: "市场数据", icon: TrendingUpIcon, color: "text-emerald-400" },
  trade: { label: "交易记录", icon: PenToolIcon, color: "text-amber-400" },
  review: { label: "复盘分析", icon: BookOpenIcon, color: "text-purple-400" },
  skill: { label: "技能执行", icon: WrenchIcon, color: "text-cyan-400" },
  workspace: { label: "工作空间", icon: TargetIcon, color: "text-pink-400" },
  research: { label: "研究成果", icon: FlaskConicalIcon, color: "text-orange-400" },
  strategy: { label: "策略引擎", icon: BrainIcon, color: "text-indigo-400" },
  user_rules: { label: "用户规则", icon: BrainIcon, color: "text-cyan-400" },
};
