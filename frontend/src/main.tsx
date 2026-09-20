import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      {/* import.meta.env.BASE_URL mirrors vite.config.ts's `base` — "/" on
          Cloudflare Pages, "/<repo-name>/" on GitHub Pages. Without this,
          every <Link to="/product/x"> would resolve to the domain root and
          404 under a GitHub Pages subpath. */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
