import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    dedupe: ["react", "react-dom"],

    alias: {
      react: path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(
        import.meta.dirname,
        "node_modules/react-dom",
      ),
    },
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
    ],

    // MapLibre ships a worker module that Vite's dependency
    // optimizer can sometimes try to prebundle incorrectly.
    exclude: [
      "maplibre-gl",
    ],
  },

  worker: {
    format: "es",
  },

  server: {
    proxy: {
      // Uploaded media (/uploads/media/<key>): served by the API, like the
      // /uploads rewrite in vercel.json does on fockis.com.
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,

        // Frontend calls:
        // /api/admin/finance/overview
        //
        // NestJS receives:
        // /admin/finance/overview
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});