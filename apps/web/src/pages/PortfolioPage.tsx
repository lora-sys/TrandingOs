import { motion, type Variants } from "framer-motion";
import {
  WalletIcon,
  PieChartIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

const features = [
  { icon: WalletIcon, label: "持仓列表", sub: "Holdings" },
  { icon: TrendingUpIcon, label: "盈亏统计", sub: "PnL Analytics" },
  { icon: PieChartIcon, label: "资产配置", sub: "Allocation" },
  { icon: ShieldCheckIcon, label: "风险指标", sub: "Risk Metrics" },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function PortfolioPage() {
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
          className="inline-flex items-center justify-center size-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-5"
        >
          <WalletIcon className="size-8 text-violet-400" />
        </motion.div>

        <h1 className="font-sans text-4xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground mt-2 text-lg">Coming Soon</p>
      </motion.div>

      {/* Animated Donut / Ring SVG */}
      <motion.svg
        viewBox="0 0 120 120"
        className="w-28 h-28 mx-auto mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={12} />
        <motion.circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke="#a78bfa"
          strokeWidth={12}
          strokeDasharray={`${2 * Math.PI * 48 * 0.65} ${2 * Math.PI * 48}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
        />
        <motion.circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke="#c084fc"
          strokeWidth={12}
          strokeDasharray={`${2 * Math.PI * 48 * 0.25} ${2 * Math.PI * 48}`}
          strokeLinecap="round"
          transform="rotate(${360 * 0.65 - 90} 60 60)"
          initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
        />
        <motion.text
          x="60"
          y="64"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-current text-[11px] font-medium"
          fill="#a78bfa"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          PnL
        </motion.text>
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
            whileHover={{ y: -3, borderColor: "rgba(167,139,250,0.3)" }}
            className="rounded-lg border border-white/10 bg-card/70 backdrop-blur-xl p-4 flex flex-col items-center text-center cursor-default transition-colors"
          >
            <div className="size-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-2">
              <Icon className="size-5 text-violet-400" />
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
        <SparklesIcon className="size-3.5 text-violet-400/60" />
        组合管理功能正在构建中，即将接入后端 API...
      </motion.p>
    </div>
  );
}
