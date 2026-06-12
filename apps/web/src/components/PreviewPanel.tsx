import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Maximize2, X, Check, BarChart3 } from "lucide-react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { tradingPiApi } from "../api.js";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";

const streamdownPlugins = { cjk, code, math, mermaid };

interface Indicator {
  name: string;
  value: string;
  signal: string;
  signalClass: string;
}

/* ─── Indicator Row (memoized) ─── */
const IndicatorRow = memo(function IndicatorRow({ ind }: { ind: Indicator }) {
  const badgeClass =
    ind.signalClass === "signal-buy" ? "signalBadge signalBadge-buy" :
    ind.signalClass === "signal-sell" ? "signalBadge signalBadge-sell" :
    "signalBadge signalBadge-neutral";
  return (
    <tr className="indicatorRow">
      <td>{ind.name}</td>
      <td className="indicatorValue">{ind.value}</td>
      <td><span className={badgeClass}>{ind.signal}</span></td>
    </tr>
  );
});

const defaultMarkdown = `# 暂无分析报告

请先执行研究工作流生成报告。

使用方法：
- 输入 "分析 ETH" 生成研究报告
- 输入 "生成交易计划" 创建交易计划
- 点击 "生成复盘报告" 查看复盘`;

const defaultIndicators: Indicator[] = [
  { name: "RSI (14)", value: "—", signal: "—", signalClass: "signal-neutral" },
  { name: "MACD", value: "—", signal: "—", signalClass: "signal-neutral" },
  { name: "EMA20", value: "—", signal: "—", signalClass: "signal-neutral" },
  { name: "EMA50", value: "—", signal: "—", signalClass: "signal-neutral" },
  { name: "布林带", value: "—", signal: "—", signalClass: "signal-neutral" },
];

export function PreviewPanel({ artifactId: initialArtifactId, onClose }: { artifactId?: string; onClose?: () => void }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [copied, setCopied] = useState(false);
  const [liveContent, setLiveContent] = useState<string | null>(null);
  const [liveTitle, setLiveTitle] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | undefined>(initialArtifactId);
  const [currentSymbol, setCurrentSymbol] = useState("ETH/USDT");

  useEffect(() => {
    setCurrentId(initialArtifactId);
    setLiveContent(null);
  }, [initialArtifactId]);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const { artifactId, content, title } = e.detail;
      setCurrentId(artifactId);
      setLiveContent(content);
      if (title) setLiveTitle(title);
    };
    window.addEventListener("pi:artifact_update", handleUpdate as any);
    return () => window.removeEventListener("pi:artifact_update", handleUpdate as any);
  }, []);

  const { data: artifactsData } = useQuery({
    queryKey: ["artifacts"],
    queryFn: tradingPiApi.artifacts,
    refetchInterval: 5000,
    enabled: !currentId,
  });

  const { data: singleArtifact } = useQuery({
    queryKey: ["artifact", currentId],
    queryFn: () => tradingPiApi.artifact(currentId!),
    enabled: !!currentId && !liveContent,
  });

  const { data: ohlcvData } = useQuery({
    queryKey: ["ohlcv", currentSymbol, "1d", 120],
    queryFn: () => tradingPiApi.ohlcv(currentSymbol, "1d", 120),
    refetchInterval: 60000,
  });

  const artifacts = (artifactsData as any[]) ?? [];
  const currentArtifact = currentId ? singleArtifact : artifacts[0];

  const markdownContent = liveContent || currentArtifact?.content || currentArtifact?.markdown || currentArtifact?.summary || defaultMarkdown;
  const artifactTitle = liveTitle || currentArtifact?.title || "预览";

  const chartData = useMemo(() => {
    const raw = (Array.isArray(ohlcvData) ? ohlcvData : (ohlcvData as any)?.rows) ?? [];
    if (raw.length === 0) return null;
    return raw.map((candle: any) => ({
      time: candle.time || candle.timestamp || new Date(candle.datetime || candle.date).toISOString().split("T")[0],
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    }));
  }, [ohlcvData]);

  const indicators = useMemo(() => {
    const data = (Array.isArray(ohlcvData) ? ohlcvData : (ohlcvData as any)?.rows) ?? [];
    if (data.length < 14) return defaultIndicators;

    const closes = data.map((c: any) => Number(c.close));
    const latest = closes[closes.length - 1];

    // RSI (14)
    let gains = 0, losses = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const rsi = losses === 0 ? 100 : Math.round(100 - 100 / (1 + gains / losses));
    const rsiSignal = rsi > 70 ? "超买" : rsi < 30 ? "超卖" : "中性";
    const rsiClass = rsi > 70 ? "signal-sell" : rsi < 30 ? "signal-buy" : "signal-neutral";

    // EMA20 / EMA50
    const ema20 = closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const ema50 = closes.slice(-50).reduce((a: number, b: number) => a + b, 0) / Math.min(50, closes.length);

    // MACD (simplified)
    const ema12 = closes.slice(-12).reduce((a: number, b: number) => a + b, 0) / 12;
    const ema26 = closes.slice(-26).reduce((a: number, b: number) => a + b, 0) / Math.min(26, closes.length);
    const macdLine = ema12 - ema26;
    const macdSignal = macdLine > 0 ? "看多" : "看空";
    const macdClass = macdLine > 0 ? "signal-buy" : "signal-sell";

    // Bollinger Bands
    const sma20 = ema20;
    const variance = closes.slice(-20).reduce((sum: number, c: number) => sum + Math.pow(c - sma20, 2), 0) / 20;
    const bbUpper = sma20 + 2 * Math.sqrt(variance);
    const bbLower = sma20 - 2 * Math.sqrt(variance);
    const bbSignal = latest > bbUpper ? "超买" : latest < bbLower ? "超卖" : "中性";
    const bbClass = latest > bbUpper ? "signal-sell" : latest < bbLower ? "signal-buy" : "signal-neutral";

    return [
      { name: "RSI (14)", value: String(rsi), signal: rsiSignal, signalClass: rsiClass },
      { name: "MACD", value: macdLine.toFixed(2), signal: macdSignal, signalClass: macdClass },
      { name: "EMA20", value: `$${ema20.toFixed(2)}`, signal: latest > ema20 ? "看多" : "...", signalClass: latest > ema20 ? "signal-buy" : "signal-neutral" },
      { name: "EMA50", value: `$${ema50.toFixed(2)}`, signal: latest > ema50 ? "看多" : "...", signalClass: latest > ema50 ? "signal-buy" : "signal-neutral" },
      { name: "布林带", value: `${bbLower.toFixed(0)}-${bbUpper.toFixed(0)}`, signal: bbSignal, signalClass: bbClass },
    ];
  }, [ohlcvData]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 200,
      layout: {
        background: { color: "#0f1722" },
        textColor: "#7a8ba0",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: 0,
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    if (chartData && chartData.length > 0) {
      candlestickSeries.setData(chartData as any);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [chartData]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [markdownContent]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  return (
    <div className="previewPanel">
      <div className="previewPanel-header">
        <h2>
          <span>预览: {artifactTitle}</span>
          <ExternalLink size={14} style={{ opacity: 0.6 }} />
        </h2>
        <div className="previewPanel-actions">
          <button onClick={handleCopy} title={copied ? "已复制" : "复制"}>
            {copied ? <Check size={14} className="copyCheckIcon" /> : <Copy size={14} />}
          </button>
          <button title="全屏">
            <Maximize2 size={14} />
          </button>
          <button onClick={handleClose} title="关闭">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="previewPanel-content">
        <div className="markdownContent" style={{ fontFamily: "inherit" }}>
          <Streamdown plugins={streamdownPlugins}>
            {markdownContent}
          </Streamdown>
        </div>

        <div className={`klineContainer ${chartData ? "klineGlow" : ""}`}>
          <div className="klineHeader">
            <span className="klineTitle">{currentSymbol} · 1D</span>
            <span className="klineTimeframe">日线</span>
          </div>
          {!chartData && ohlcvData === undefined ? (
            <div className="chartSkeleton">
              <div className="skeletonLine" style={{ width: "80%", height: 14 }} />
              <div className="skeletonLine" style={{ width: "60%", height: 14 }} />
              <div className="skeletonLine" style={{ width: "90%", height: 14 }} />
            </div>
          ) : !chartData ? (
            <div className="chartPlaceholder">
              <BarChart3 size={32} />
              <span>暂无行情数据</span>
            </div>
          ) : (
            <div ref={chartContainerRef} style={{ height: "160px" }} />
          )}
        </div>

        <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "16px 0 8px", color: "var(--text-primary)" }}>
          关键指标
        </h3>
        <table className="indicatorTable">
          <thead>
            <tr>
              <th>指标</th>
              <th>数值</th>
              <th>信号</th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((ind) => (
              <IndicatorRow key={ind.name} ind={ind} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
