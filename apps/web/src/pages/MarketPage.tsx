import { motion } from "framer-motion";
import {
  TrendingUpIcon,
  BarChart3Icon,
  LineChartIcon,
  ActivityIcon,
  SparklesIcon,
} from "lucide-react";

const features = [
  { icon: BarChart3Icon, label: "K线图", sub: "Candlestick Charts" },
  { icon: LineChartIcon, label: "订单簿", sub: "Order Book" },
  { icon: ActivityIcon, label: "深度数据", sub: "Depth Data" },
  { icon: TrendingUpIcon, label: "实时行情", sub: "Real-time Quotes" },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function MarketPage() {
  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center pt-10 pb-8"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="inline-flex items-center justify-center size-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-5"
        >
          <TrendingUpIcon className="size-8 text-cyan-400" />
        </motion.div>

        <h1 className="font-sans text-4xl font-bold tracking-tight">Market</h1>
        <p className="text-muted-foreground mt-2 text-lg">Coming Soon</p>
      </motion.div>

      {/* Animated Chart SVG */}
      <motion.svg
        viewBox="0 0 400 80"
        className="w-full h-20 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <defs>
          <linearGradient id="marketGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <motion.path
          d="M0 60 Q50 55 80 40 T160 35 T240 45 T320 20 T400 30 L400 80 L0 80 Z"
          fill="url(#marketGrad)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5, duration: 1.5, ease: "easeInOut" }}
        />
        <motion.path
          d="M0 60 Q50 55 80 40 T160 35 T240 45 T320 20 T400 30"
          fill="none"
          stroke="#22d3ee"
          strokeWidth={2}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5, duration: 1.5, ease: "easeInOut" }}
        />
        {[60, 40, 35, 45, 20, 30].map((cy, i) => (
          <motion.circle
            key={i}
            cx={i * 80}
            cy={cy}
            r={3}
            fill="#22d3ee"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.4, 1] }}
            transition={{ delay: 1.5 + i * 0.15, duration: 0.4 }}
          />
        ))}
      </motion.svg>

      {/* Feature Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4 mb-10"
      >
        {features.map(({ icon: Icon, label, sub }) => (
          <motion.div
            key={label}
            variants={itemVariants}
            whileHover={{ y: -3, borderColor: "rgba(34,211,238,0.3)" }}
            className="rounded-lg border border-white/10 bg-card/70 backdrop-blur-xl p-4 flex flex-col items-center text-center cursor-default transition-colors"
          >
            <div className="size-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-2">
              <Icon className="size-5 text-cyan-400" />
            </div>
            <span className="font-medium text-sm">{label}</span>
            <span className="text-xs text-muted-foreground">{sub}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom Text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="text-center text-muted-foreground text-sm pb-8 flex items-center justify-center gap-1.5"
      >
        <SparklesIcon className="size-3.5 text-cyan-400/60" />
        市场分析功能正在构建中，即将接入后端 API...
      </motion.p>
    </div>
  );
}
