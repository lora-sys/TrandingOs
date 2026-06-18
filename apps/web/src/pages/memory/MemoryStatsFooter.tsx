import { DownloadIcon } from "lucide-react";

interface MemoryStatsFooterProps {
  records: any[];
  searchedRecords: any[];
  domainCount: number;
  onRefresh: () => void;
}

export function MemoryStatsFooter({ records, searchedRecords, domainCount, onRefresh }: MemoryStatsFooterProps) {
  if (records.length === 0) return null;

  return (
    <div className="text-center text-muted-foreground text-xs">
      共 {records.length} 条记忆记录 · {domainCount} 个领域
      <button className="ml-2 underline hover:text-foreground" onClick={onRefresh} type="button">刷新</button>
      <button
        onClick={() => {
          const data = searchedRecords.map((r: any) => ({ domain: r.domain, key: r.key, value: r.value, importance: r.importance, timestamp: r.timestamp }));
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `trading-pi-memory-${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}
        className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
      >
        <DownloadIcon className="size-3" />
        Export JSON
      </button>
    </div>
  );
}
