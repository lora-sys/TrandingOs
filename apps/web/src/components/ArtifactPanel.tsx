"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  SparklesIcon,
  FileTextIcon,
  DownloadIcon,
  XIcon,
  ChevronRightIcon,
} from "lucide-react";
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
  ArtifactClose,
} from "@/components/ai-elements/artifact";
import { tradingPiApi } from "@/api";
import { motion } from "framer-motion";

type ArtifactPanelProps = {
  open: boolean;
  onClose: () => void;
  selectedArtifactId: string | null;
  onSelectArtifact: (id: string) => void;
};

type ArtifactItem = {
  id: string;
  title: string;
  summary?: string;
  type?: string;
  content?: string;
  createdAt?: string;
};

function downloadArtifact(artifact: ArtifactItem) {
  const content = artifact.content || artifact.summary || "";
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${artifact.title || "artifact"}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ArtifactPanel({
  open,
  onClose,
  selectedArtifactId,
  onSelectArtifact,
}: ArtifactPanelProps) {
  const [artifactContent, setArtifactContent] = useState<string | null>(null);

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: ["artifacts"],
    queryFn: () => tradingPiApi.artifacts() as Promise<ArtifactItem[]>,
    refetchInterval: 15_000,
    enabled: open,
  });

  const selectedArtifact = artifacts.find((a) => a.id === selectedArtifactId) ?? null;

  useEffect(() => {
    if (!selectedArtifactId) {
      setArtifactContent(null);
      return;
    }
    // Try to use inline content first
    const found = artifacts.find((a) => a.id === selectedArtifactId);
    if (found?.content) {
      setArtifactContent(found.content);
      return;
    }
    // Fetch full artifact content
    tradingPiApi
      .artifact(selectedArtifactId)
      .then((data: any) => {
        if (data?.content || data?.markdown) {
          setArtifactContent(data.content || data.markdown);
        }
      })
      .catch(() => {
        setArtifactContent(null);
      });
  }, [selectedArtifactId, artifacts]);

  if (!open) return null;

  return (
    <div className="flex h-full flex-col border-l border-white/[0.08] bg-card/70 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <span className="text-sm font-medium font-sans text-foreground">
          Artifacts
        </span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors"
          type="button"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {/* Artifact list (when nothing selected) */}
      {!selectedArtifact ? (
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="size-5 animate-pulse rounded-full bg-cyan-500/30" />
            </div>
          ) : artifacts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <SparklesIcon className="size-6 opacity-40" />
              <span className="text-xs">No artifacts yet</span>
            </div>
          ) : (
            artifacts.map((a) => (
              <motion.button
                key={a.id}
                onClick={() => onSelectArtifact(a.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-xs transition-colors ${
                  selectedArtifactId === a.id
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "hover:bg-white/[0.05] text-muted-foreground"
                }`}
                whileHover={{ x: 2 }}
                type="button"
              >
                <div className="font-medium truncate">{a.title}</div>
                <div className="mt-0.5 text-[10px] opacity-60">
                  {a.type || "unknown"}
                </div>
              </motion.button>
            ))
          )}
        </div>
      ) : (
        /* Artifact detail view */
        <div className="flex-1 overflow-auto">
          <Artifact className="flex h-full flex-col">
            <ArtifactHeader>
              <div className="min-w-0 flex-1">
                <ArtifactTitle>{selectedArtifact.title}</ArtifactTitle>
                <ArtifactDescription>
                  {selectedArtifact.summary || ""}
                </ArtifactDescription>
              </div>
              <ArtifactClose onClick={() => onSelectArtifact("")} />
            </ArtifactHeader>
            <ArtifactActions>
              <ArtifactAction
                tooltip="Download"
                label="Download"
                icon={DownloadIcon}
                onClick={() => downloadArtifact(selectedArtifact)}
              />
            </ArtifactActions>
            <ArtifactContent>
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {artifactContent || "Loading..."}
              </pre>
            </ArtifactContent>
          </Artifact>
        </div>
      )}
    </div>
  );
}
