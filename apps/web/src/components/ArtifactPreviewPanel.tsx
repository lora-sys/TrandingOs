import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { Tabs } from "@heroui/react/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clipboard, Download, Eye } from "lucide-react";
import { tradingPiApi } from "../api/client.js";

export function ArtifactPreviewPanel() {
  const artifacts = useQuery({ queryKey: ["artifacts"], queryFn: tradingPiApi.artifacts });
  const latest = artifacts.data?.[0];
  const preview = useQuery({
    queryKey: ["artifact-preview", latest?.id],
    queryFn: async () => latest ? tradingPiApi.artifactPreview(latest.id) : undefined,
    enabled: Boolean(latest?.id),
  });
  const copy = useMutation({
    mutationFn: async () => {
      const content = preview.data?.output.content ?? latest?.summary ?? "";
      await navigator.clipboard.writeText(content);
      return true;
    },
  });

  return (
    <Card className="artifactPreview heroPanel">
      <Card.Header className="panelTitle"><Eye size={16} /> Artifact Preview</Card.Header>
      {!latest && <p className="empty">No artifact selected.</p>}
      {latest && (
        <>
          <div className="previewMeta">
            <strong>{latest.title}</strong>
            <Chip size="sm" variant="flat" color={preview.data?.output.previewReady ? "success" : "warning"}>
              {preview.data?.output.contentType ?? latest.type}
            </Chip>
          </div>
          <Tabs aria-label="Artifact preview tabs">
            <Tabs.List>
              <Tabs.Tab id="markdown">Markdown</Tabs.Tab>
              <Tabs.Tab id="html">HTML</Tabs.Tab>
              <Tabs.Tab id="pdf">PDF</Tabs.Tab>
              <Tabs.Tab id="data">Data</Tabs.Tab>
              <Tabs.Tab id="meta">Meta</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel id="markdown">
              <div className="previewScroll">
                <pre>{preview.data?.output.content ?? latest.summary}</pre>
              </div>
            </Tabs.Panel>
            <Tabs.Panel id="html">
              <div className="previewScroll">
                {String(preview.data?.output.contentType ?? "").includes("html") ? (
                  <iframe title="HTML artifact preview" className="artifactFrame" sandbox="allow-same-origin" srcDoc={preview.data?.output.content ?? ""} />
                ) : (
                  <pre>{JSON.stringify({ previewReady: preview.data?.output.previewReady, previewPayload: preview.data?.output.previewPayload }, null, 2)}</pre>
                )}
              </div>
            </Tabs.Panel>
            <Tabs.Panel id="pdf">
              <div className="previewScroll">
                <pre>{JSON.stringify({ contentType: preview.data?.output.contentType, export: "PDF export is available when Browser Skill/AIO Sandbox produces a PDF artifact.", previewPayload: preview.data?.output.previewPayload }, null, 2)}</pre>
              </div>
            </Tabs.Panel>
            <Tabs.Panel id="data">
              <div className="previewScroll">
                <pre>{JSON.stringify(latest, null, 2)}</pre>
              </div>
            </Tabs.Panel>
            <Tabs.Panel id="meta">
              <div className="previewScroll">
                <pre>{JSON.stringify(preview.data?.output.previewPayload ?? latest, null, 2)}</pre>
              </div>
            </Tabs.Panel>
          </Tabs>
          <div className="previewActions">
            <Button size="sm" variant="secondary" onClick={() => copy.mutate()}><Clipboard size={14} /> Copy</Button>
            <Button size="sm" variant="secondary"><Download size={14} /> Export</Button>
          </div>
        </>
      )}
    </Card>
  );
}
