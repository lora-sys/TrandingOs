import { Search, FileText, TrendingUp, PenTool, RefreshCw } from "lucide-react";

interface TradingLoopProps {
  currentStep?: number;
}

const steps = [
  { label: "研究分析", sublabel: "市场研究与分析", icon: Search },
  { label: "制定计划", sublabel: "生成交易计划", icon: FileText },
  { label: "模拟交易", sublabel: "Paper Trading 执行", icon: TrendingUp },
  { label: "记录原因", sublabel: "记录交易理由", icon: PenTool },
  { label: "自动复盘", sublabel: "AI 分析与改进建议", icon: RefreshCw },
];

export function TradingLoop({ currentStep = 0 }: TradingLoopProps) {
  return (
    <div className="tradingLoop">
      <div className="tradingLoop-header">交易闭环流程</div>
      <div className="tradingLoop-steps">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className={`tradingLoop-step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}>
              <div className="step-icon">
                <Icon size={18} />
              </div>
              <div className="step-label">{step.label}</div>
              <div className="step-sublabel">{step.sublabel}</div>
              {i < steps.length - 1 && <div className="step-arrow">→</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
