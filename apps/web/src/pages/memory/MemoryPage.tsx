import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { tradingPiApi } from "@/api/client";

import { MemorySearchBar } from "./MemorySearchBar";
import { DomainCards } from "./DomainCards";
import { DomainBreadcrumb } from "./DomainBreadcrumb";
import { MemoryRecordsList } from "./MemoryRecordsList";
import { MemoryStatsFooter } from "./MemoryStatsFooter";
import type { MemoryDomain } from "./types";

export function MemoryPage() {
  const [selectedDomain, setSelectedDomain] = useState<MemoryDomain | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: memoryData, isLoading, refetch } = useQuery({
    queryKey: ["memory"],
    queryFn: () => tradingPiApi.memory().catch(() => null),
    refetchInterval: 10000,
  });

  const records = Array.isArray(memoryData) ? memoryData : [];

  // Group by domain
  const grouped = records.reduce(
    (acc, record: any) => {
      const domain = (record.domain ?? "conversation") as MemoryDomain;
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(record);
      return acc;
    },
    {} as Record<MemoryDomain, any[]>,
  );

  // Filter
  const filteredDomains = selectedDomain ? { [selectedDomain]: grouped[selectedDomain] ?? [] } : grouped;
  const searchedRecords = searchQuery
    ? Object.values(filteredDomains).flat().filter((r: any) =>
        `${r.key} ${r.value}`.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : Object.values(filteredDomains).flat();

  const domainEntries = Object.entries(grouped) as [MemoryDomain, any[]][];

  return (
    <motion.div
      className="mx-auto w-full max-w-5xl p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Memory</h1>
        <p className="text-muted-foreground text-sm mt-1">Agent 记忆管理 — 按领域分组的长期/短期记忆</p>
      </div>

      {/* Search */}
      <MemorySearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Domain Summary Cards */}
      {!searchQuery && !selectedDomain && (
        <DomainCards domainEntries={domainEntries} onSelectDomain={setSelectedDomain} />
      )}

      {/* Domain filter breadcrumb */}
      {selectedDomain && (
        <DomainBreadcrumb
          selectedDomain={selectedDomain}
          count={(grouped[selectedDomain] ?? []).length}
          onClear={() => setSelectedDomain(null)}
        />
      )}

      {/* Records list */}
      <MemoryRecordsList
        isLoading={isLoading}
        searchedRecords={searchedRecords}
        totalRecords={records.length}
        onDelete={() => refetch()}
      />

      {/* Stats footer */}
      <MemoryStatsFooter
        records={records}
        searchedRecords={searchedRecords}
        domainCount={Object.keys(grouped).length}
        onRefresh={() => refetch()}
      />
    </motion.div>
  );
}
