import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

// Vite config for 政务智聊 React frontend.
// - base: './' so built index.html uses relative asset paths (Flask static-serves dist/)
// - server.proxy: forward /api to Flask on :5000 during dev (same-origin via proxy → cookies just work)
// - build.outDir: ../static/dist so `python app.py` can serve the SPA from a single port
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: false,
        ws: false,
      },
      "/static/downloads": {
        target: "http://localhost:5000",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "../static/dist",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
})
