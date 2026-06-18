import { useEffect, useState } from "react";
import type { ThemeMode } from "@/core/types";

/**
 * Resolve the effective theme ("dark" | "light") from a ThemeMode setting.
 * Listens for system preference changes when mode is "system".
 */
export function useResolvedTheme(themeMode: ThemeMode) {
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true,
  );

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;
}
