import express from "express";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { createDatabasePool, initializeSchema } from "./db.js";
import { mountAuthRoutes } from "./auth.js";
import { mountCatalogRoutes, publishedStaffItemSlugExists } from "./catalog.js";

const portValue = process.env.PORT || "3000";
const port = Number(portValue);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Invalid server port configuration");
}

const app = express();
const server = createServer(app);
const pool = createDatabasePool();
let ready = false;
let vite: ViteDevServer | undefined;

app.disable("x-powered-by");
app.use(express.json({ limit: "128kb", strict: true }));

app.get("/_health", (_request, response) => {
  if (!ready) {
    response.status(503).json({ status: "not_ready" });
    return;
  }
  response.status(200).json({ status: "ok" });
});

mountAuthRoutes(app, pool);
mountCatalogRoutes(app, pool);

app.use((request, response, next) => {
  if (request.path === "/api" || request.path.startsWith("/api/")) {
    response.status(404).json({ error: "API route not found" });
    return;
  }
  next();
});

async function start(): Promise<void> {
  await initializeSchema(pool);
  ready = true;

  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const staticDirectory = path.resolve(process.cwd(), "dist");
    app.use((request, response, next) => {
      if (request.method !== "GET" && request.method !== "HEAD") return next();
      const relativePath = request.path.replace(/^\/+|\/+$/g, "");
      const directory = path.resolve(staticDirectory, relativePath || ".");
      const indexPath = path.join(directory, "index.html");
      const rootPrefix = `${staticDirectory}${path.sep}`;
      if (
        (directory === staticDirectory || directory.startsWith(rootPrefix)) &&
        existsSync(indexPath)
      ) {
        response.sendFile(indexPath, (error) => {
          if (error) next(error);
        });
        return;
      }
      next();
    });
    app.use(express.static(staticDirectory, { index: false, fallthrough: true, redirect: false }));
    app.get("/{*splat}", async (request, response, next) => {
      const relativePath = request.path.replace(/^\/+|\/+$/g, "");
      const directory = path.resolve(staticDirectory, relativePath || ".");
      const indexPath = path.join(directory, "index.html");
      const rootPrefix = `${staticDirectory}${path.sep}`;
      if (
        (directory === staticDirectory || directory.startsWith(rootPrefix)) &&
        existsSync(indexPath)
      ) {
        response.sendFile(indexPath, (error) => {
          if (error) next(error);
        });
        return;
      }

      const staffProductPath = /^\/product\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.path);
      if (staffProductPath && await publishedStaffItemSlugExists(pool, request.path.split("/").pop() || "")) {
        response.sendFile(path.join(staticDirectory, "index.html"), (error) => {
          if (error) next(error);
        });
        return;
      }

      const missingPage = path.join(staticDirectory, "404.html");
      const fallbackPage = existsSync(missingPage)
        ? missingPage
        : path.join(staticDirectory, "index.html");
      response.status(404).sendFile(fallbackPage, (error) => {
        if (error) next(error);
      });
    });
  }

  app.use((_error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    response.status(500).json({ error: "Internal server error" });
  });

  server.listen(port, "0.0.0.0");
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    ready = false;
    server.close();
    try {
      await vite?.close();
      await pool.end();
    } finally {
      process.exit(0);
    }
  };
  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());
}

void start().catch(async () => {
  ready = false;
  try {
    await vite?.close();
    await pool.end();
  } catch {
    // Startup failures are intentionally not logged to avoid exposing configuration.
  }
  process.exitCode = 1;
});
