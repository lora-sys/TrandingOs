import { motion } from "framer-motion";
import type { MemoryDomain } from "./types";
import { DOMAIN_META } from "./types";

interface DomainBreadcrumbProps {
  selectedDomain: MemoryDomain;
  count: number;
  onClear: () => void;
}

export function DomainBreadcrumb({ selectedDomain, count, onClear }: DomainBreadcrumbProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 text-sm">
        <button className="text-muted-foreground hover:text-foreground" onClick={onClear} type="button">
          ← 全部领域
        </button>
        <span>/</span>
        <span className={`font-medium ${DOMAIN_META[selectedDomain]?.color}`}>
          {DOMAIN_META[selectedDomain]?.label}
        </span>
        <span className="text-muted-foreground">({count})</span>
      </div>
    </motion.div>
  );
}
