import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  leftOpen: boolean;
  rightOpen: boolean;
  previewOpen: boolean;
  selectedArtifactId: string | undefined;
  paperTrading: boolean;
  sessionId: string | undefined;

  setLeftOpen: (v: boolean) => void;
  setRightOpen: (v: boolean) => void;
  setPreviewOpen: (v: boolean, artifactId?: string) => void;
  setPaperTrading: (v: boolean) => void;
  setSessionId: (id: string | undefined) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      leftOpen: true,
      rightOpen: true,
      previewOpen: false,
      selectedArtifactId: undefined,
      paperTrading: true,
      sessionId: undefined,
      setLeftOpen: (v) => set({ leftOpen: v }),
      setRightOpen: (v) => set({ rightOpen: v }),
      setPreviewOpen: (v, artifactId) =>
        set({ previewOpen: v, selectedArtifactId: artifactId ?? undefined }),
      setPaperTrading: (v) => set({ paperTrading: v }),
      setSessionId: (id) => set({ sessionId: id }),
    }),
    {
      name: "trading-pi-ui",
      partialize: (s) => ({ paperTrading: s.paperTrading, leftOpen: s.leftOpen }),
    }
  )
);
