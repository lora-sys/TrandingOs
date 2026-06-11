import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { Tab, TabList, TabPanel, Tabs } from "@heroui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clipboard, Download, Eye } from "lucide-react";
import { tradingPiApi } from "../api/client.js";

export function ArtifactPreviewPanel() {
  const artifacts = (useQuery as any)({ queryKey: ["artifacts"], queryFn: tradingPiApi.artifacts });
  const latest: any = artifacts.data?.[0];
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

  if (!latest) return (
    <Card className="artifactPreview heroPanel">
      <Card.Header className="panelTitle"><Eye size={16} /> Artifact Preview</Card.Header>
      <Card.Content><p className="empty">No artifact selected.</p></Card.Content>
    </Card>
  );

  return (
    <Card className="artifactPreview heroPanel">
      <Card.Header className="panelTitle"><Eye size={16} /> Artifact Preview</Card.Header>
      <div className="previewMeta px-3 pb-2">
        <strong>{latest.title}</strong>
        <Chip size="sm" variant="flat" color={preview.data?.output.previewReady ? "success" : "warning"}>
          {preview.data?.output.contentType ?? latest.type}
        </Chip>
      </div>
      <Tabs aria-label="Artifact preview tabs" className="px-3">
        <TabList>
          <Tab key="markdown">Markdown</Tab>
          <Tab key="html">HTML</Tab>
          <Tab key="data">Data</Tab>
          <Tab key="meta">Meta</Tab>
        </TabList>
        <TabPanel key="markdown">
          <pre className="font-mono text-sm whitespace-pre-wrap max-h-[56vh] overflow-auto p-2">{preview.data?.output.content ?? latest.summary}</pre>
        </TabPanel>
        <TabPanel key="html">
          <div className="max-h-[56vh] overflow-auto p-2">
            {String(preview.data?.output.contentType ?? "").includes("html") ? (
              <iframe title="HTML preview" className="w-full min-h-[420px] border border-[#26384e] rounded-lg bg-white" sandbox="allow-same-origin" srcDoc={preview.data?.output.content ?? ""} />
            ) : (
              <pre className="font-mono text-sm">{JSON.stringify({ previewReady: preview.data?.output.previewReady, previewPayload: preview.data?.output.previewPayload }, null, 2)}</pre>
            )}
          </div>
        </TabPanel>
        <TabPanel key="data">
          <pre className="font-mono text-sm whitespace-pre-wrap max-h-[56vh] overflow-auto p-2">{JSON.stringify(latest, null, 2)}</pre>
        </TabPanel>
        <TabPanel key="meta">
          <pre className="font-mono text-sm whitespace-pre-wrap max-h-[56vh] overflow-auto p-2">{JSON.stringify(preview.data?.output.previewPayload ?? latest, null, 2)}</pre>
        </TabPanel>
      </Tabs>
      <div className="flex gap-2 p-3">
        <Button size="sm" variant="secondary" onPress={() => copy.mutate()}><Clipboard size={14} /> Copy</Button>
        <Button size="sm" variant="secondary"><Download size={14} /> Export</Button>
      </div>
    </Card>
  );
}