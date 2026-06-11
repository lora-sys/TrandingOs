import { defineConfig } from "@tanstack/react-start/config";

export default defineConfig({
  server: {
    preset: "node-server",
  },
  tsr: {
    routeDirectory: "./src/routes",
  },
});
