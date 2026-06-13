import { WalletIcon } from "lucide-react";

export function PortfolioPage() {
  return (
    <div className="mx-auto w-full max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-muted-foreground text-sm mt-1">持仓管理与交易记录</p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center space-y-3">
        <WalletIcon className="size-12 mx-auto text-muted-foreground/50" />
        <h2 className="font-medium text-lg">持仓管理</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          持仓列表、盈亏统计、风险指标等管理功能即将接入。
        </p>
        <p className="text-muted-foreground/60 text-xs">Coming soon — 后端联调阶段</p>
      </div>
    </div>
  );
}
