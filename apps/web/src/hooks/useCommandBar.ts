import { useCallback, useEffect, useState } from "react";
import { isEditableTarget } from "@/core/format";

export interface CommandAction {
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export interface UseCommandBarReturn {
  /** Whether command palette is open */
  open: boolean;
  /** Open the command palette */
  openPalette: () => void;
  /** Close the command palette */
  closePalette: () => void;
  /** Registered command actions */
  actions: CommandAction[];
  /** Replace all actions (or use initialActions on first render) */
  setActions: (actions: CommandAction[]) => void;
}

interface UseCommandBarOptions {
  /** Initial command actions */
  initialActions?: CommandAction[];
  /** Extra keydown bindings beyond Cmd+K, /, Escape */
  extraBindings?: (event: KeyboardEvent, helpers: { close: () => void; abort?: () => void }) => void;
  /** Abort callback for Escape key during streaming */
  onAbort?: () => void;
  /** Whether currently streaming (affects Escape behavior) */
  isStreaming?: boolean;
}

/**
 * useCommandBar — Keyboard shortcuts and command palette management.
 *
 * Encapsulates:
 * - Global keydown listener (Cmd+K → palette, / → focus input, Escape → close/abort)
 * - Command action registry
 * - Palette open/close state
 *
 * The hook manages a single global keydown listener and cleans up on unmount.
 */
export function useCommandBar(options: UseCommandBarOptions = {}): UseCommandBarReturn {
  const [open, setOpen] = useState(false);

  const [actions, setActions] = useState<CommandAction[]>(options.initialActions ?? []);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "/") {
        event.preventDefault();
        document.querySelector<HTMLTextAreaElement>('textarea[name="message"]')?.focus();
      } else if (event.key === "Escape") {
        if (open) {
          setOpen(false);
        } else if (options.isStreaming && options.onAbort) {
          options.onAbort();
        }
      }

      options.extraBindings?.(event, { close: closePalette, abort: options.onAbort });
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [options.onAbort, options.isStreaming, options.extraBindings, open, closePalette]);

  return { open, openPalette, closePalette, actions, setActions };
}
