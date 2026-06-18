import { motion } from "framer-motion";
import { FlaskConicalIcon, RadarIcon, StarIcon } from "lucide-react";

type AlphaRadarCardProps = {
  title: string;
  category?: string;
  source?: string;
  currentValue?: string;
  change24h?: string;
  volume?: string;
  riskRating?: number;
  reasoning?: string;
  onClick?: () => void;
  onResearchClick?: () => void;
};

const categoryTone: Record<string, string> = {
  sports: "border-l-cyan-300",
  politics: "border-l-violet-300",
  crypto: "border-l-emerald-300",
  macro: "border-l-amber-300",
  entertainment: "border-l-pink-300",
};

export function AlphaRadarCard({
  title,
  category = "signal",
  source = "radar",
  currentValue = "n/a",
  change24h = "flat",
  volume = "n/a",
  riskRating = 3,
  reasoning,
  onClick,
  onResearchClick,
}: AlphaRadarCardProps) {
  const tone = categoryTone[String(category).toLowerCase()] ?? "border-l-cyan-300";
  const risk = Math.max(1, Math.min(5, Math.round(riskRating)));
  return (
    <motion.article
      className={`min-h-52 rounded-lg border border-white/10 border-l-2 ${tone} bg-card/70 p-4 backdrop-blur-xl transition-colors hover:border-cyan-400/35`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <button className="block w-full text-left" onClick={onClick} type="button">
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="rounded border border-white/10 px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">{category}</span>
          <RadarIcon className="size-4 text-cyan-300" />
        </div>
        <h2 className="line-clamp-3 text-sm font-medium leading-5">{title}</h2>
        {reasoning && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{reasoning}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Mini label="value" value={currentValue || "n/a"} />
          <Mini label="change" value={change24h} />
          <Mini label="volume" value={volume} />
          <Mini label="source" value={source} />
        </div>
      </button>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5" aria-label={`risk ${risk} of 5`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <StarIcon className={`size-3 ${index < risk ? "fill-amber-300 text-amber-300" : "text-muted-foreground"}`} key={index} />
          ))}
        </div>
        <button className="inline-flex items-center gap-1 rounded-md border border-cyan-400/30 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-400/10" onClick={(event) => { event.stopPropagation(); onResearchClick?.(); }} type="button">
          <FlaskConicalIcon className="size-3" />
          Research this
        </button>
      </div>
    </motion.article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-white/10 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-xs leading-4">{value}</div>
    </div>
  );
}
