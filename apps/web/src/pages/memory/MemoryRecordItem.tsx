import { Trash2Icon } from "lucide-react";
import { motion } from "framer-motion";
import { formatDateTime } from "@/lib/formatters";
import { tradingPiApi } from "@/api/client";
import type { MemoryDomain } from "./types";
import { DOMAIN_META } from "./types";

interface MemoryRecordItemProps {
  record: any;
  index: number;
  onDelete: () => void;
}

export function MemoryRecordItem({ record, index, onDelete }: MemoryRecordItemProps) {
  const domain = (record.domain ?? "conversation") as MemoryDomain;
  const meta = DOMAIN_META[domain] ?? DOMAIN_META.conversation;
  const IconComp = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
      key={record.id ?? `${record.scope}:${record.key}:${index}`}
      layout
    >
      <div className="group flex items-start gap-3 border-b last:border-b-0 p-3 hover:bg-white/[0.03] transition-colors">
        <IconComp className={`size-4 mt-0.5 shrink-0 ${meta.color}`} />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm">{record.key || "(未命名)"}</div>
          <pre className="bg-muted rounded-md p-2 mt-1 text-xs overflow-auto whitespace-pre-wrap break-words max-h-32">
            {typeof record.value === "string" ? record.value : JSON.stringify(record.value, null, 2)}
          </pre>
          {record.importance != null && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-muted-foreground text-xs">重要性:</span>
              {Array.from({ length: Math.max(1, Math.min(5, Math.round(Number(record.importance) * 5))) }).map((_, j) => (
                <span className="size-1.5 rounded-full bg-primary" key={j} />
              ))}
            </div>
          )}
          {record.created_at && (
            <div className="mt-0.5 text-muted-foreground text-xs">
              {formatDateTime(record.created_at)}
            </div>
          )}
        </div>
        <button
          onClick={async () => {
            if (!confirm(`Delete memory "${record.key}"?`)) return;
            await tradingPiApi.deleteMemory(record.id);
            onDelete();
          }}
          aria-label={`Delete memory ${record.key || record.id}`}
          className="shrink-0 rounded p-1 text-red-400/60 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
          title="Delete memory record"
          type="button"
        >
          <Trash2Icon className="size-3" />
        </button>
      </div>
    </motion.div>
  );
}
