import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [".claude/**", "node_modules/**", "dist/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});