import { motion } from "framer-motion";
import { MemoryRecordItem } from "./MemoryRecordItem";

interface MemoryRecordsListProps {
  isLoading: boolean;
  searchedRecords: any[];
  totalRecords: number;
  onDelete: () => void;
}

export function MemoryRecordsList({ isLoading, searchedRecords, totalRecords, onDelete }: MemoryRecordsListProps) {
  return (
    <div className="rounded-lg border bg-card/70 backdrop-blur-xl border-white/[0.08] space-y-0">
      {isLoading ? (
        <div className="p-4 text-center text-muted-foreground text-sm">加载中...</div>
      ) : searchedRecords.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            {totalRecords === 0
              ? "暂无记忆数据，请先在对话中与 Agent 交互。Agent 会自动将重要信息存入各领域的记忆。"
              : "没有匹配的搜索结果"}
          </motion.p>
        </div>
      ) : (
        searchedRecords.map((record: any, i: number) => (
          <MemoryRecordItem key={record.id ?? `${record.scope}:${record.key}:${i}`} record={record} index={i} onDelete={onDelete} />
        ))
      )}
    </div>
  );
}
