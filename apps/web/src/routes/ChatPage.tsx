import { ArtifactPreviewPanel } from "../components/ArtifactPreviewPanel.js";
import { ChatWorkspace } from "../components/ChatWorkspace.js";

export function ChatPage() {
  return (
    <div className="chatWithPreview">
      <ChatWorkspace />
      <ArtifactPreviewPanel />
    </div>
  );
}
