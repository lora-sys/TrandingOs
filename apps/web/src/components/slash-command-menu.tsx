"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/**
 * Catalog of slash commands exposed to the chat composer.
 * Mirrors the workflow router in packages/core/src/agent/trading-pi-agent.ts.
 */
export const SLASH_COMMANDS = [
  { cmd: "/research", desc: "Deep research on symbol", example: "/research ETH" },
  { cmd: "/plan", desc: "Generate trade plan", example: "/plan ETH 100 spot" },
  { cmd: "/review-day", desc: "Daily review", example: "/review-day" },
  { cmd: "/backtest", desc: "Backtest strategy", example: "/backtest my_strategy ETH/USDT 1h" },
  { cmd: "/browser", desc: "Browser evidence", example: "/browser search ethereum news" },
  { cmd: "/evolve", desc: "Propose rule improvements", example: "/evolve" },
  { cmd: "/bootstrap-os", desc: "Bootstrap OS workspaces", example: "/bootstrap-os" },
] as const;

export interface SlashCommand {
  cmd: string;
  desc: string;
  example: string;
}

export interface SlashCommandMenuProps {
  inputValue: string;
  onSelect: (example: string) => void;
}

/**
 * SlashCommandMenu — autocomplete popover shown above the prompt textarea
 * when the user types `/`. Filters the SLASH_COMMANDS catalog by the query
 * after `/` and supports keyboard (↑↓ / Enter / Esc) and click navigation.
 */
export function SlashCommandMenu({ inputValue, onSelect }: SlashCommandMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const isActive = inputValue.trimStart().startsWith("/");
  const query = useMemo(() => {
    if (!isActive) return "";
    const tail = inputValue.trimStart().slice(1);
    // Stop matching once user types a space (i.e. past the command word itself)
    const spaceIdx = tail.search(/\s/);
    return spaceIdx === -1 ? tail.toLowerCase() : tail.slice(0, spaceIdx).toLowerCase();
  }, [inputValue, isActive]);

  const filtered = useMemo(() => {
    if (!isActive) return [];
    if (query === "") return [...SLASH_COMMANDS];
    return SLASH_COMMANDS.filter((entry) => entry.cmd.toLowerCase().includes(query));
  }, [isActive, query]);

  // Reset selection when filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Focus active item via ref when keyboard nav moves it
  useEffect(() => {
    const node = itemRefs.current[activeIndex];
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!isActive || filtered.length === 0) {
    return null;
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filtered.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const choice = filtered[activeIndex];
      if (choice) onSelect(choice.example);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onSelect(""); // empty string signals close
    }
  };

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-50 mb-2"
      data-testid="slash-command-menu"
      onKeyDown={handleKeyDown}
      role="listbox"
    >
      <Command className="rounded-lg border bg-popover shadow-md">
        <CommandList>
          <ScrollArea className="max-h-64">
            <CommandGroup heading="Commands">
              {filtered.map((entry, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <CommandItem
                    key={entry.cmd}
                    ref={(node: HTMLDivElement | null) => {
                      itemRefs.current[idx] = node;
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col items-start gap-0.5 px-3 py-2",
                      isSelected && "bg-accent text-accent-foreground",
                    )}
                    data-cmd={entry.cmd}
                    data-selected={isSelected ? "true" : "false"}
                    onClick={() => onSelect(entry.example)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    role="option"
                    value={entry.cmd}
                  >
                    <span className="font-mono text-sm">{entry.cmd}</span>
                    <span className="text-muted-foreground text-xs">{entry.desc}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </ScrollArea>
        </CommandList>
      </Command>
    </div>
  );
}