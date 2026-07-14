import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./apps/web/src") },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["apps/web/vitest.setup.ts"],
    environmentMatchGlobs: [["apps/**", "jsdom"]],
    include: ["packages/**/src/**/*.{test,spec}.{ts,tsx}", "apps/**/src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [".claude/**", "node_modules/**", "dist/**", "**/node_modules/**"],
  },
});