import { createServer } from "vite";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const template = await readFile(path.join(distDir, "index.html"), "utf8");
const vite = await createServer({
  root: rootDir,
  configFile: path.join(rootDir, "vite.config.ts"),
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
});

try {
  const [{ render }, { products }, { seoForPath }] = await Promise.all([
    vite.ssrLoadModule("/src/entry-server.tsx"),
    vite.ssrLoadModule("/src/data/products.ts"),
    vite.ssrLoadModule("/src/data/seo.ts"),
  ]);
  const paths = [
    "/",
    "/shop",
    "/faq",
    "/cart",
    "/checkout",
    "/staff",
    ...products.map((product) => `/product/${product.slug}`),
  ];
  for (const routePath of paths) {
    const info = seoForPath(routePath);
    const html = applyMeta(template, render(routePath), info, routePath);
    const dir =
      routePath === "/"
        ? distDir
        : path.join(distDir, routePath.replace(/^\//, ""));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), html);
  }
  const missing = seoForPath("/__not-found");
  await writeFile(
    path.join(distDir, "404.html"),
    applyMeta(template, render("/__not-found"), missing, "/__not-found"),
  );
} finally {
  await vite.close();
}

function applyMeta(source, body, info, routePath) {
  let html = source.replace(
    '<div id="root" data-ssr="0"></div>',
    `<div id="root" data-ssr="1" data-ssr-path="${escapeAttr(routePath)}">${body}</div>`,
  );
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(info.title)}</title>`,
  );
  html = upsertMeta(html, "name", "description", info.description);
  html = upsertMeta(html, "property", "og:type", info.type);
  html = upsertMeta(html, "property", "og:site_name", "SunSensor Eyewear");
  html = upsertMeta(html, "property", "og:title", info.title);
  html = upsertMeta(html, "property", "og:description", info.description);
  html = upsertMeta(html, "property", "og:image", info.image);
  html = upsertMeta(html, "name", "twitter:card", "summary_large_image");
  html = upsertMeta(html, "name", "twitter:title", info.title);
  html = upsertMeta(html, "name", "twitter:description", info.description);
  html = upsertMeta(html, "name", "twitter:image", info.image);
  if (info.noindex) html = upsertMeta(html, "name", "robots", "noindex,follow");
  return html;
}

function upsertMeta(html, kind, key, value) {
  const pattern = new RegExp(
    `<meta\\s+${kind}="${key}"\\s+content="[^"]*"\\s*\\/>`,
  );
  const tag = `<meta ${kind}="${escapeAttr(key)}" content="${escapeAttr(value)}" />`;
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function escapeHtml(text) {
  return escapeAttr(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(text) {
  return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
