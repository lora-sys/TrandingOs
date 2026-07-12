import { useCallback, useEffect, useState } from "react";
import type { ModelInfo } from "@/core/types";
import { tradingPiApi } from "@/api";

export interface UseModelPickerReturn {
  /** Current selected model */
  model: ModelInfo | null;
  /** List of available models */
  models: ModelInfo[];
  /** Whether picker popover is open */
  open: boolean;
  /** Search query for filtering models */
  search: string;
  /** Select a model */
  select: (model: ModelInfo) => Promise<void>;
  /** Open/close the picker */
  setOpen: (v: boolean) => void;
  /** Update search query */
  setSearch: (q: string) => void;
  /** Context window size of selected model */
  contextWindowSize: number;
  /** True while the initial model list is being loaded */
  loading: boolean;
}

interface UseModelPickerOptions {
  /** Called when user selects a model */
  onSelect?: (model: ModelInfo) => void;
  /** RPC call to execute set_model command */
  onSetModel?: (model: ModelInfo) => Promise<void>;
  /** Error setter */
  onError?: (msg: string) => void;
}

/**
 * useModelPicker — Manages model selection state and UI.
 *
 * Encapsulates:
 * - Available models list (fetched from /api/config/models)
 * - Search/filter
 * - Selection with optional RPC sync
 * - Context window tracking
 */
export function useModelPicker(options: UseModelPickerOptions = {}): UseModelPickerReturn {
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contextWindowSize, setContextWindowSize] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch available models on mount; populate list + sync current selection.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await tradingPiApi.configModels();
        if (cancelled) return;
        const list: ModelInfo[] = res.models.map((m) => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          contextWindow: m.contextWindow,
        }));
        setModels(list);
        // Sync the current selection from the response.
        const current = list.find((m) => m.id === res.current);
        if (current) {
          setModel(current);
          if (current.contextWindow) setContextWindowSize(current.contextWindow);
        }
      } catch (err) {
        if (!cancelled) {
          options.onError?.(err instanceof Error ? err.message : "Failed to load models");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = useCallback(async (selected: ModelInfo) => {
    try {
      if (options.onSetModel) {
        await options.onSetModel(selected);
      }
      setModel(selected);
      if (selected.contextWindow) setContextWindowSize(selected.contextWindow);
      setOpen(false);
      options.onSelect?.(selected);
    } catch (err) {
      options.onError?.(err instanceof Error ? err.message : "Failed to switch model");
    }
  }, [options]);

  return { model, models, open, search, select, setOpen, setSearch, contextWindowSize, loading };
}
