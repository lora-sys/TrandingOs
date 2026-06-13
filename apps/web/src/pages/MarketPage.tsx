import { TrendingUpIcon } from "lucide-react";

export function MarketPage() {
  return (
    <div className="mx-auto w-full max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Market</h1>
        <p className="text-muted-foreground text-sm mt-1">市场行情与数据分析</p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center space-y-3">
        <TrendingUpIcon className="size-12 mx-auto text-muted-foreground/50" />
        <h2 className="font-medium text-lg">市场行情</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          K 线图、订单簿、深度数据等市场分析功能即将接入后端 API。
        </p>
        <p className="text-muted-foreground/60 text-xs">Coming soon — 后端联调阶段</p>
      </div>
    </div>
  );
}
