import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: Number(process.env.TRADING_PI_WEB_PORT ?? 5173),
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.TRADING_PI_API_PORT ?? 8787}`,
        changeOrigin: true,
      },
    },
  },
});
