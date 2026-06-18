import { motion } from "framer-motion";
import type { MemoryDomain } from "./types";
import { DOMAIN_META } from "./types";

interface DomainCardsProps {
  domainEntries: [MemoryDomain, any[]][];
  onSelectDomain: (domain: MemoryDomain) => void;
}

export function DomainCards({ domainEntries, onSelectDomain }: DomainCardsProps) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, staggerChildren: 0.06 }}
    >
      {domainEntries.map(([domain, items]) => {
        const meta = DOMAIN_META[domain] ?? DOMAIN_META.conversation;
        const IconComp = meta.icon;
        return (
          <motion.button
            className="flex items-center gap-3 rounded-lg border bg-card/70 backdrop-blur-xl border-white/[0.08] p-3 text-left transition-colors hover:bg-white/[0.04]"
            key={domain}
            onClick={() => onSelectDomain(domain)}
            type="button"
            whileHover={{ scale: 1.02 }}
          >
            <div className={`size-9 rounded-lg flex items-center justify-center ${meta.color.replace("text-", "bg-").replace("-400", "/15")}`}>
              <IconComp className={`size-5 shrink-0 ${meta.color}`} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm">{meta.label}</div>
              <div className="text-muted-foreground text-xs">{items.length} 条记录</div>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
