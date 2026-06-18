import { DownloadIcon, FileTextIcon, FileCodeIcon, FileIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toHtml, toMarkdown, toPdf } from "@/lib/exportService";

export type ChatItemForExport = {
  role: "user" | "assistant" | "tool" | "tool_result" | "system";
  text?: string;
  thinking?: string;
  toolName?: string;
  toolArgs?: string;
  toolResult?: string;
};

type ExportMenuProps = {
  items: ChatItemForExport[];
  filenamePrefix?: string;
};

export function ExportMenu({ items, filenamePrefix = "trading-pi-chat" }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const runExport = (action: () => void | Promise<void>) => {
    setOpen(false);
    void action();
  };

  return (
    <div className="relative inline-flex" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
        onClick={() => setOpen((current) => !current)}
        title="Export conversation"
        type="button"
      >
        <DownloadIcon className="size-3.5" />
        Export
      </button>
      {open && (
        <div
          aria-label="Export options"
          className="absolute right-0 bottom-full z-50 mb-1 w-44 rounded-lg border border-white/[0.08] bg-card/95 p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 backdrop-blur-xl"
          role="menu"
        >
          <button
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-sm outline-hidden hover:bg-accent hover:text-accent-foreground"
            onClick={() => runExport(() => toHtml(items, filenamePrefix))}
            role="menuitem"
            type="button"
          >
            <FileTextIcon className="size-4 text-cyan-400" />
            <span>
              <span className="block text-sm font-medium">HTML</span>
              <span className="block text-[10px] text-muted-foreground">Styled dark theme</span>
            </span>
          </button>
          <button
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-sm outline-hidden hover:bg-accent hover:text-accent-foreground"
            onClick={() => runExport(() => toMarkdown(items, filenamePrefix))}
            role="menuitem"
            type="button"
          >
            <FileCodeIcon className="size-4 text-purple-400" />
            <span>
              <span className="block text-sm font-medium">Markdown</span>
              <span className="block text-[10px] text-muted-foreground">Portable text</span>
            </span>
          </button>
          <button
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-sm outline-hidden hover:bg-accent hover:text-accent-foreground"
            onClick={() => runExport(() => toPdf(items, filenamePrefix))}
            role="menuitem"
            type="button"
          >
            <FileIcon className="size-4 text-red-400" />
            <span>
              <span className="block text-sm font-medium">PDF</span>
              <span className="block text-[10px] text-muted-foreground">Print-ready</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
