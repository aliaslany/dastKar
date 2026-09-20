import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project sites are served under /<repo-name>/, not the
  // domain root, so every asset path needs that prefix baked in at build
  // time. Cloudflare Pages serves from the domain root, so this stays "/"
  // for that build — the GH Pages Action below sets BASE_PATH explicitly.
  base: process.env.BASE_PATH ?? "/",
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
