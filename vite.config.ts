import react from "@vitejs/plugin-react";
import type { Connect } from "vite";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { handleHealth, handleToken, type Env } from "./server/frankie.js";

// Serves /api/frankie/token and /api/frankie/health from Node in `vite dev` and
// `vite preview`, so FRANKIE_JWT_SECRET never reaches the browser bundle.
// On Vercel the same handlers run as functions from api/frankie/*.
function frankieServerRoutes(env: Env): Plugin {
  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    const path = req.url?.split("?")[0];
    if (path !== "/api/frankie/token" && path !== "/api/frankie/health") return next();
    const request = new Request(new URL(req.url!, "http://localhost"), {
      method: req.method,
      headers: { cookie: req.headers.cookie ?? "" },
    });
    const response = path === "/api/frankie/token" ? await handleToken(request, env) : handleHealth(env);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(await response.text());
  };
  return {
    name: "frankie-server-routes",
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  return {
    plugins: [react(), frankieServerRoutes(env)],
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
  };
});
