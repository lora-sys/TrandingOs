import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Minimal ScrollArea (shadcn-compatible) ── */

export function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative overflow-auto", className)}
      data-slot="scroll-area"
      {...props}
    >
      {children}
    </div>
  );
}

export function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & { orientation?: "vertical" | "horizontal" }) {
  return (
    <div
      aria-orientation={orientation}
      className={cn(
        "flex touch-none select-none transition-colors",
        orientation === "vertical" && "h-full w-2 border-l border-transparent p-px",
        orientation === "horizontal" && "h-2 w-full border-t border-transparent p-px",
        className,
      )}
      data-slot="scroll-bar"
      role="presentation"
      {...props}
    />
  );
}
