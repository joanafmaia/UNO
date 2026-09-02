import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite para Discord Activities:
 * - Proxy de /api e /socket.io para o Express (porta 3001)
 * - HMR na porta 443 só com VITE_DISCORD_TUNNEL=true (túnel Cloudflare)
 */
export default defineConfig({
  plugins: [react()],
  envDir: "..",
  resolve: {
    alias: {
      "@shared": path.resolve(root, "../shared"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    fs: {
      allow: [path.resolve(root, "..")],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true,
      },
    },
    ...(process.env.VITE_DISCORD_TUNNEL === "true"
      ? { hmr: { clientPort: 443 } }
      : {}),
  },
  preview: {
    port: 5173,
  },
});
