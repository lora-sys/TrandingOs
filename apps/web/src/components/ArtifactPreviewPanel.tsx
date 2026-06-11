import { Chip } from "@heroui/react/chip";
import { Tab, TabList, TabPanel, Tabs } from "@heroui/react/tabs";
import { Clipboard, Download, Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { tradingPiApi } from "../api/client.js";

import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactDescription, ArtifactActions, ArtifactAction, ArtifactContent } from "@/components/ai-elements/artifact.js";

export function ArtifactPreviewPanel() {
  const [latest, setLatest] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load the latest artifact (no preview auto-fetch)
  useEffect(() => {
    let cancelled = false;
    tradingPiApi.artifacts().then((data: any) => {
      if (cancelled) return;
      const arr = data ?? [];
      if (arr.length > 0) setLatest(arr[0]);
    });
    return () => { cancelled = true; };
  }, []);

  const handlePreview = useCallback(async () => {
    if (!latest) return;
    setShowPreview(true);
    try {
      const data = await tradingPiApi.artifactPreview(latest.id);
      setPreviewData(data);
    } catch {
      setPreviewData({ output: { content: latest.summary, contentType: latest.type } });
    }
  }, [latest]);

  const handleCopy = useCallback(async () => {
    const content = previewData?.output?.content ?? latest?.summary ?? "";
    await navigator.clipboard.writeText(content);
  }, [previewData, latest]);

  if (!latest) {
    return (
      <Artifact>
        <ArtifactHeader>
          <ArtifactTitle><Eye size={16} /> Artifact Preview</ArtifactTitle>
        </ArtifactHeader>
        <ArtifactContent>
          <p style={{ color: "#8da1b6", textAlign: "center", padding: "24px 0" }}>No artifact selected.</p>
        </ArtifactContent>
      </Artifact>
    );
  }

  return (
    <Artifact>
      <ArtifactHeader>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Eye size={16} />
          <div>
            <ArtifactTitle>{latest.title}</ArtifactTitle>
            <ArtifactDescription>
              <Chip size="sm" variant="soft" color={previewData?.output?.previewReady ? "success" : "warning"}>
                {previewData?.output?.contentType ?? latest.type}
              </Chip>
            </ArtifactDescription>
          </div>
        </div>
        <ArtifactActions>
          <ArtifactAction tooltip="Preview" onClick={handlePreview}>
            <Eye size={14} />
          </ArtifactAction>
          <ArtifactAction tooltip="Copy" onClick={handleCopy}>
            <Clipboard size={14} />
          </ArtifactAction>
        </ArtifactActions>
      </ArtifactHeader>
      {showPreview && (
        <ArtifactContent style={{ padding: 0 }}>
          <Tabs aria-label="Artifact preview tabs" className="px-3">
            <TabList>
            <Tab key="markdown" id="markdown" {...({ children: "Markdown" } as any)} />
            <Tab key="html" id="html" {...({ children: "HTML" } as any)} />
            <Tab key="data" id="data" {...({ children: "Data" } as any)} />
            <Tab key="meta" id="meta" {...({ children: "Meta" } as any)} />
            </TabList>
            <TabPanel key="markdown">
              <pre className="font-mono text-sm whitespace-pre-wrap max-h-[56vh] overflow-auto p-2" style={{ color: "#d7e2ed" }}>
                {previewData?.output?.content ?? latest.summary}
              </pre>
            </TabPanel>
            <TabPanel key="html">
              <div className="max-h-[56vh] overflow-auto p-2">
                {String(previewData?.output?.contentType ?? "").includes("html") ? (
                  <iframe
                    title="HTML preview"
                    className="w-full min-h-[420px] border border-[#26384e] rounded-lg bg-white"
                    sandbox="allow-same-origin"
                    srcDoc={previewData?.output?.content ?? ""}
                  />
                ) : (
                  <pre className="font-mono text-sm" style={{ color: "#d7e2ed" }}>
                    {JSON.stringify(
                      { previewReady: previewData?.output?.previewReady, previewPayload: previewData?.output?.previewPayload },
                      null,
                      2,
                    )}
                  </pre>
                )}
              </div>
            </TabPanel>
            <TabPanel key="data">
              <pre className="font-mono text-sm whitespace-pre-wrap max-h-[56vh] overflow-auto p-2" style={{ color: "#d7e2ed" }}>
                {JSON.stringify(latest, null, 2)}
              </pre>
            </TabPanel>
            <TabPanel key="meta">
              <pre className="font-mono text-sm whitespace-pre-wrap max-h-[56vh] overflow-auto p-2" style={{ color: "#d7e2ed" }}>
                {JSON.stringify(previewData?.output?.previewPayload ?? latest, null, 2)}
              </pre>
            </TabPanel>
          </Tabs>
        </ArtifactContent>
      )}
    </Artifact>
  );
}
