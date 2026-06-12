import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { SessionProvider } from "./session.js";
import { TopBar } from "./TopBar.js";
import { LeftSidebar } from "./LeftSidebar.js";
import { RightSidebar } from "./RightSidebar.js";
import { PreviewPanel } from "./PreviewPanel.js";
import { ErrorBoundary } from "./ErrorBoundary.js";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function Layout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <SessionProvider>
      <main
        className={`appShell ${leftOpen ? "left-open" : ""} ${rightOpen ? "right-open" : ""} ${previewOpen ? "preview-open" : ""}`}
        id="appShell"
      >
        <TopBar
          leftDrawerOpen={leftOpen}
          onToggleLeftDrawer={() => setLeftOpen((o) => !o)}
          onToggleRightDrawer={() => setRightOpen((o) => !o)}
        />

        {isMobile && (leftOpen || rightOpen) && (
          <div className="sidebarOverlay visible" onClick={() => { setLeftOpen(false); setRightOpen(false); }} />
        )}

        <ErrorBoundary name="LeftSidebar">
          <LeftSidebar
            drawerOpen={leftOpen}
            onCloseDrawer={() => setLeftOpen(false)}
          />
        </ErrorBoundary>

        <section className="workspace">{children}</section>

        <div className="previewContainer" style={{ display: previewOpen ? "block" : "none" }}>
           <PreviewPanel artifactId={selectedArtifactId} onClose={() => setPreviewOpen(false)} />
        </div>

        <button
          className="previewToggleBtn"
          style={{ 
            display: "flex", 
            bottom: "32px", 
            right: previewOpen ? (rightOpen ? "780px" : "500px") : (rightOpen ? "300px" : "20px"),
            transition: "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
          onClick={() => setPreviewOpen((o) => !o)}
          title={previewOpen ? "Hide Preview" : "Show Preview"}
        >
          {previewOpen ? "▶" : "◀"}
        </button>

        <ErrorBoundary name="RightSidebar">
          <RightSidebar
            drawerOpen={rightOpen}
            onCloseDrawer={() => setRightOpen(false)}
            onOpenPreview={(artifactId) => {
              setPreviewOpen(true);
              if (artifactId) setSelectedArtifactId(artifactId);
            }}
          />
        </ErrorBoundary>
      </main>
    </SessionProvider>
  );
}
