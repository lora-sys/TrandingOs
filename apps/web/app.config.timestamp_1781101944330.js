// app.config.ts
import { defineConfig } from "@tanstack/react-start/config";
var app_config_default = defineConfig({
  server: {
    preset: "node-server"
  },
  tsr: {
    routeDirectory: "./src/routes"
  }
});
export {
  app_config_default as default
};
