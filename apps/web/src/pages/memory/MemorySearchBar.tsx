import { SearchIcon } from "lucide-react";
import { motion } from "framer-motion";

interface MemorySearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function MemorySearchBar({ searchQuery, onSearchChange }: MemorySearchBarProps) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          className="w-full rounded-md border bg-card/50 backdrop-blur-sm border-white/[0.08] pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索记忆内容..."
          value={searchQuery}
        />
      </div>
    </motion.div>
  );
}
