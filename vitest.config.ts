import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["packages/**/src/**/*.{test,spec}.{ts,tsx}", "apps/**/src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [".claude/**", "node_modules/**", "dist/**", "**/node_modules/**"],
  },
});