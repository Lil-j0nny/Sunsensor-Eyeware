import { createHmac, randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { requestStaff, staffFrom } from "./auth.js";

const MAX_IMAGE_BYTES = 24 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MIME_TYPES: Record<string, { mediaType: "image" | "video"; extension: string }> = {
  "image/jpeg": { mediaType: "image", extension: "jpg" },
  "image/png": { mediaType: "image", extension: "png" },
  "image/webp": { mediaType: "image", extension: "webp" },
  "image/gif": { mediaType: "image", extension: "gif" },
  "image/avif": { mediaType: "image", extension: "avif" },
  "video/mp4": { mediaType: "video", extension: "mp4" },
  "video/webm": { mediaType: "video", extension: "webm" },
  "video/quicktime": { mediaType: "video", extension: "mov" },
};

type CatalogRow = RowDataPacket & {
  id: string;
  created_by: number;
  item_type: "Frame" | "Lens";
  name: string | null;
  description: string | null;
  price_ksh: number | string | null;
  status: "draft" | "published";
  media_id: string | null;
  file_name: string | null;
  content_type: string | null;
  media_type: "image" | "video" | null;
  position: number | null;
  storage_key: string | null;
  media_status: "pending" | "ready" | "hidden" | null;
};

type ItemState = RowDataPacket & {
  id: string;
  item_type: "Frame" | "Lens";
  name: string | null;
  description: string | null;
  price_ksh: number | string | null;
  status: "draft" | "published";
};

function validType(value: unknown): value is "Frame" | "Lens" {
  return value === "Frame" || value === "Lens";
}

function cleanName(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 255) return undefined;
  return value.trim();
}

function cleanDescription(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 10000) return undefined;
  return value.trim();
}

function cleanPrice(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return undefined;
  return value;
}

function completeFields(name: string | null, type: unknown, price: number | null): boolean {
  return Boolean(name?.trim()) && validType(type) && typeof price === "number" &&
    Number.isSafeInteger(price) && price > 0;
}

function slugFor(name: string | null, id: string): string {
  const stem = (name || "listing")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "listing";
  return `${stem}-${id.slice(0, 8)}`;
}

function itemId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function safeFileName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const leaf = value.replace(/\\/g, "/").split("/").pop()?.trim() || "";
  if (!leaf || leaf.length > 255 || /[\u0000-\u001f\u007f]/.test(leaf)) return null;
  return leaf;
}

function stableUrl(storageKey: string): string {
  return `/api/media/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

function itemFromRows(rows: CatalogRow[]): Array<Record<string, unknown>> {
  const grouped = new Map<string, { row: CatalogRow; media: Array<Record<string, unknown>> }>();
  for (const row of rows) {
    let item = grouped.get(row.id);
    if (!item) {
      item = { row, media: [] };
      grouped.set(row.id, item);
    }
    if (row.media_id && row.storage_key && row.media_status && row.media_status !== "hidden") {
      item.media.push({
        id: row.media_id,
        mediaType: row.media_type,
        url: stableUrl(row.storage_key),
        contentType: row.content_type,
        fileName: row.file_name,
        uploadStatus: row.media_status,
      });
    }
  }
  return [...grouped.values()].map(({ row, media }) => ({
    id: row.id,
    slug: slugFor(row.name, row.id),
    itemType: row.item_type,
    name: row.name,
    description: row.description,
    priceKsh: row.price_ksh === null ? null : Number(row.price_ksh),
    status: row.status,
    media,
  }));
}

const selectCatalog = `SELECT i.id, i.created_by, i.item_type, i.name, i.description,
       i.price_ksh, i.status, m.id AS media_id, m.file_name, m.content_type,
       m.media_type, m.position, m.storage_key, m.status AS media_status
  FROM sunsensor_new_catalog_items i
  LEFT JOIN sunsensor_new_catalog_media m ON m.item_id = i.id`;

export async function publishedStaffItemSlugExists(pool: Pool, slug: string): Promise<boolean> {
  const [rows] = await pool.query<CatalogRow[]>(
    `${selectCatalog}
     WHERE i.status = 'published'
       AND i.name IS NOT NULL AND TRIM(i.name) <> ''
       AND i.price_ksh IS NOT NULL AND i.price_ksh > 0
       AND m.status = 'ready'`,
  );
  return itemFromRows(rows).some((item) => item.slug === slug);
}

function sendBadRequest(response: Response, error: string): void {
  response.status(400).json({ error });
}

function requiredStorageEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error("Storage service unavailable");
  return value;
}

function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function awsSigningKey(secret: string, date: string, region: string): Buffer {
  const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value).digest();
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

async function presignedStorageUrl(operation: "put" | "get", storageKey: string): Promise<string> {
  const endpoint = new URL(requiredStorageEnv("S3_ENDPOINT"));
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) throw new Error("Storage service unavailable");
  const bucket = requiredStorageEnv("S3_BUCKET");
  const region = requiredStorageEnv("S3_REGION");
  const accessKey = requiredStorageEnv("S3_ACCESS_KEY_ID");
  const secret = requiredStorageEnv("S3_SECRET_ACCESS_KEY");
  const style = process.env.S3_URL_STYLE || "path";
  if (style !== "path" && style !== "virtual-host") throw new Error("Storage service unavailable");
  const keyPath = storageKey.split("/").map(awsEncode).join("/");
  const basePath = endpoint.pathname.replace(/\/$/, "");
  const host = style === "virtual-host" ? `${bucket}.${endpoint.host}` : endpoint.host;
  const canonicalUri = style === "virtual-host" ? `${basePath}/${keyPath}` : `${basePath}/${awsEncode(bucket)}/${keyPath}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const params: Array<[string, string]> = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${accessKey}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", operation === "put" ? "900" : "300"],
    ["X-Amz-SignedHeaders", "host"],
  ];
  const canonicalQuery = params
    .map(([name, value]) => [awsEncode(name), awsEncode(value)] as const)
    .sort(([an, av], [bn, bv]) => an.localeCompare(bn) || av.localeCompare(bv))
    .map(([name, value]) => `${name}=${value}`).join("&");
  const canonicalRequest = [
    operation === "put" ? "PUT" : "GET",
    canonicalUri,
    canonicalQuery,
    `host:${host.toLowerCase()}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256", amzDate, scope,
    createHmac("sha256", Buffer.from("")).update(canonicalRequest).digest("hex"),
  ].join("\n");
  const signature = createHmac("sha256", awsSigningKey(secret, dateStamp, region)).update(stringToSign).digest("hex");
  const url = new URL(endpoint.toString());
  url.hostname = host;
  url.pathname = canonicalUri;
  url.search = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  return url.toString();
}

async function presignedPutUrl(storageKey: string): Promise<string> {
  return presignedStorageUrl("put", storageKey);
}

async function managedObjectMatches(
  storageKey: string,
  contentType: string,
  sizeBytes: number,
): Promise<boolean> {
  const downloadUrl = await presignedStorageUrl("get", storageKey);
  const response = await fetch(downloadUrl, {
    headers: { Range: "bytes=0-0" },
    signal: AbortSignal.timeout(15_000),
  });
  const responseType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  let storedSize: number | null = null;
  if (response.status === 206) {
    const range = /^bytes 0-0\/(\d+)$/i.exec(response.headers.get("content-range") || "");
    if (range) storedSize = Number(range[1]);
  } else if (response.status === 200) {
    const length = response.headers.get("content-length");
    if (length && /^\d+$/.test(length)) storedSize = Number(length);
  }
  if (
    (response.status !== 206 && response.status !== 200) ||
    responseType !== contentType.toLowerCase() ||
    storedSize !== sizeBytes
  ) {
    await response.body?.cancel().catch(() => undefined);
    return false;
  }

  const reader = response.body?.getReader();
  if (!reader) return false;
  try {
    const firstChunk = await reader.read();
    return !firstChunk.done && (response.status === 206
      ? firstChunk.value?.byteLength === 1
      : (firstChunk.value?.byteLength ?? 0) > 0);
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export function mountCatalogRoutes(app: Express, pool: Pool): void {
  app.get(/^\/api\/media\/(.+)$/, async (request, response) => {
    const storageKey = typeof request.params[0] === "string" ? request.params[0] : "";
    if (!/^sunsensor\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|gif|avif|mp4|webm|mov)$/i.test(storageKey)) {
      response.status(404).end();
      return;
    }
    try {
      response.redirect(302, await presignedStorageUrl("get", storageKey));
    } catch {
      response.status(503).end();
    }
  });

  const staffOnly = requestStaff(pool);

  app.get("/api/catalog", async (_request, response) => {
    try {
      const [rows] = await pool.query<CatalogRow[]>(
        `${selectCatalog}
         WHERE i.status = 'published'
           AND i.name IS NOT NULL AND TRIM(i.name) <> ''
           AND i.price_ksh IS NOT NULL AND i.price_ksh > 0
           AND m.status = 'ready'
         ORDER BY i.updated_at DESC, m.position ASC, m.created_at ASC`,
      );
      response.json({ items: itemFromRows(rows) });
    } catch {
      response.status(503).json({ error: "Catalog temporarily unavailable" });
    }
  });

  app.get("/api/staff/items", staffOnly, async (_request, response) => {
    try {
      const [rows] = await pool.execute<CatalogRow[]>(
        `${selectCatalog}
         ORDER BY i.updated_at DESC, m.position ASC, m.created_at ASC`,
      );
      response.json({ items: itemFromRows(rows) });
    } catch {
      response.status(503).json({ error: "Staff catalog temporarily unavailable" });
    }
  });

  app.post("/api/staff/items", staffOnly, async (request, response) => {
    const body = request.body as Record<string, unknown> | undefined;
    const accepted = new Set(["itemType", "name", "description", "priceKsh"]);
    if (!body || Object.keys(body).some((field) => !accepted.has(field))) {
      return sendBadRequest(response, "Invalid catalog item fields");
    }
    const type = body.itemType;
    const name = body.name === undefined ? null : cleanName(body.name);
    const description = body.description === undefined ? null : cleanDescription(body.description);
    const price = body.priceKsh === undefined ? null : cleanPrice(body.priceKsh);
    if (!validType(type)) return sendBadRequest(response, "Type must be Frame or Lens");
    if (name === undefined) return sendBadRequest(response, "Name is invalid");
    if (description === undefined) return sendBadRequest(response, "Description is invalid");
    if (price === undefined) return sendBadRequest(response, "Price must be a positive whole number or null");
    try {
      const id = randomUUID();
      await pool.execute(
        `INSERT INTO sunsensor_new_catalog_items (id, created_by, item_type, name, description, price_ksh)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, staffFrom(request).id, type, name, description, price],
      );
      response.status(201).json({
        item: { id, slug: slugFor(name, id), itemType: type, name, description, priceKsh: price, status: "draft", media: [] },
      });
    } catch {
      response.status(503).json({ error: "Could not create catalog draft" });
    }
  });

  app.patch("/api/staff/items/:id", staffOnly, async (request, response) => {
    const id = itemId(request.params.id);
    if (!id) return sendBadRequest(response, "Invalid item id");
    const body = request.body as Record<string, unknown> | undefined;
    const accepted = new Set(["itemType", "name", "description", "priceKsh"]);
    if (!body || !Object.keys(body).length || Object.keys(body).some((field) => !accepted.has(field))) {
      return sendBadRequest(response, "Invalid catalog item fields");
    }
    try {
      const [rows] = await pool.execute<ItemState[]>(
        `SELECT id, item_type, name, description, price_ksh, status
           FROM sunsensor_new_catalog_items WHERE id = ? LIMIT 1`,
        [id],
      );
      const existing = rows[0];
      if (!existing) {
        response.status(404).json({ error: "Catalog item not found" });
        return;
      }
      const type = "itemType" in body ? body.itemType : existing.item_type;
      const name = "name" in body ? cleanName(body.name) : existing.name;
      const description = "description" in body ? cleanDescription(body.description) : existing.description;
      const price = "priceKsh" in body ? cleanPrice(body.priceKsh) : existing.price_ksh === null ? null : Number(existing.price_ksh);
      if (!validType(type)) return sendBadRequest(response, "Type must be Frame or Lens");
      if (name === undefined) return sendBadRequest(response, "Name is invalid");
      if (description === undefined) return sendBadRequest(response, "Description is invalid");
      if (price === undefined) return sendBadRequest(response, "Price must be a positive whole number or null");
      if (existing.status === "published" && !completeFields(name, type, price)) {
        return sendBadRequest(response, "A published item must retain a non-empty name and positive whole-KSh price");
      }
      await pool.execute(
        `UPDATE sunsensor_new_catalog_items
            SET item_type = ?, name = ?, description = ?, price_ksh = ?
          WHERE id = ?`,
        [type, name, description, price, id],
      );
      response.json({ item: { id, slug: slugFor(name, id), itemType: type, name, description, priceKsh: price } });
    } catch {
      response.status(503).json({ error: "Could not update catalog item" });
    }
  });

  app.post("/api/staff/items/:id/publish", staffOnly, async (request, response) => {
    const id = itemId(request.params.id);
    if (!id) return sendBadRequest(response, "Invalid item id");
    try {
      const [items] = await pool.execute<ItemState[]>(
        `SELECT id, item_type, name, description, price_ksh, status
           FROM sunsensor_new_catalog_items WHERE id = ? LIMIT 1`,
        [id],
      );
      const item = items[0];
      if (!item) {
        response.status(404).json({ error: "Catalog item not found" });
        return;
      }
      const price = item.price_ksh === null ? null : Number(item.price_ksh);
      if (!completeFields(item.name, item.item_type, price)) {
        return sendBadRequest(response, "A non-empty name, type, and positive whole-KSh price are required to publish");
      }
      const [media] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM sunsensor_new_catalog_media WHERE item_id = ? AND status = 'ready' LIMIT 1",
        [id],
      );
      if (!media.length) return sendBadRequest(response, "At least one ready media upload is required to publish");
      await pool.execute(
        "UPDATE sunsensor_new_catalog_items SET status = 'published' WHERE id = ?",
        [id],
      );
      response.json({ item: { id, status: "published" } });
    } catch {
      response.status(503).json({ error: "Could not publish catalog item" });
    }
  });

  app.post("/api/staff/items/:id/unpublish", staffOnly, async (request, response) => {
    const id = itemId(request.params.id);
    if (!id) return sendBadRequest(response, "Invalid item id");
    try {
      const [result] = await pool.execute(
        "UPDATE sunsensor_new_catalog_items SET status = 'draft' WHERE id = ?",
        [id],
      );
      if ((result as { affectedRows: number }).affectedRows === 0) {
        const [rows] = await pool.execute<RowDataPacket[]>(
          "SELECT id FROM sunsensor_new_catalog_items WHERE id = ? LIMIT 1",
          [id],
        );
        if (!rows.length) {
          response.status(404).json({ error: "Catalog item not found" });
          return;
        }
      }
      response.json({ item: { id, status: "draft" } });
    } catch {
      response.status(503).json({ error: "Could not unpublish catalog item" });
    }
  });

  app.post("/api/staff/items/:id/media", staffOnly, async (request, response) => {
    const id = itemId(request.params.id);
    if (!id) return sendBadRequest(response, "Invalid item id");
    const body = request.body as Record<string, unknown> | undefined;
    const fileName = safeFileName(body?.fileName);
    const contentType = typeof body?.contentType === "string" ? body.contentType.trim().toLowerCase() : "";
    const fileSpec = MIME_TYPES[contentType];
    const sizeBytes = body?.sizeBytes;
    if (!fileName || !fileSpec || typeof sizeBytes !== "number" || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
      return sendBadRequest(response, "File name, supported image/video MIME type, and positive size are required");
    }
    const maxSize = fileSpec.mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (sizeBytes > maxSize) {
      return sendBadRequest(response, fileSpec.mediaType === "image" ? "Image exceeds 24 MiB maximum" : "Video exceeds 100 MiB maximum");
    }
    try {
      const [items] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM sunsensor_new_catalog_items WHERE id = ? LIMIT 1",
        [id],
      );
      if (!items.length) {
        response.status(404).json({ error: "Catalog item not found" });
        return;
      }
      const mediaId = randomUUID();
      const storageKey = `sunsensor/${id}/${mediaId}.${fileSpec.extension}`;
      const [positions] = await pool.execute<RowDataPacket[]>(
        "SELECT COALESCE(MAX(position) + 1, 0) AS next_position FROM sunsensor_new_catalog_media WHERE item_id = ? AND status <> 'hidden'",
        [id],
      );
      const position = Number(positions[0]?.next_position ?? 0);
      const uploadUrl = await presignedPutUrl(storageKey);
      await pool.execute(
        `INSERT INTO sunsensor_new_catalog_media
           (id, item_id, file_name, content_type, media_type, size_bytes, position, storage_key, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [mediaId, id, fileName, contentType, fileSpec.mediaType, sizeBytes, position, storageKey],
      );
      response.status(201).json({ uploadUrl, mediaId, publicPath: stableUrl(storageKey) });
    } catch {
      response.status(503).json({ error: "Could not prepare media upload" });
    }
  });

  app.post("/api/staff/items/:id/media/:mediaId/complete", staffOnly, async (request, response) => {
    const id = itemId(request.params.id);
    const mediaId = itemId(request.params.mediaId);
    if (!id || !mediaId) return sendBadRequest(response, "Invalid media identifier");
    if ((request.body as Record<string, unknown> | undefined)?.uploaded !== true) {
      return sendBadRequest(response, "Confirm a successful upload before completing media");
    }
    try {
      const [mediaRows] = await pool.execute<(RowDataPacket & {
        storage_key: string;
        content_type: string;
        size_bytes: number | string;
        status: "pending" | "ready" | "hidden";
      })[]>(
        `SELECT m.storage_key, m.content_type, m.size_bytes, m.status
           FROM sunsensor_new_catalog_media m
           JOIN sunsensor_new_catalog_items i ON i.id = m.item_id
          WHERE m.id = ? AND m.item_id = ? LIMIT 1`,
        [mediaId, id],
      );
      const media = mediaRows[0];
      if (!media || media.status === "hidden") {
        response.status(404).json({ error: "Media upload not found" });
        return;
      }
      const sizeBytes = Number(media.size_bytes);
      if (
        !Number.isSafeInteger(sizeBytes) ||
        !await managedObjectMatches(media.storage_key, media.content_type, sizeBytes)
      ) {
        response.status(409).json({ error: "The uploaded file could not be verified. Upload it again." });
        return;
      }

      await pool.execute(
        `UPDATE sunsensor_new_catalog_media m
           JOIN sunsensor_new_catalog_items i ON i.id = m.item_id
            SET m.status = 'ready'
          WHERE m.id = ? AND m.item_id = ? AND m.status IN ('pending','ready')`,
        [mediaId, id],
      );
      const [readyRows] = await pool.execute<RowDataPacket[]>(
        `SELECT m.id FROM sunsensor_new_catalog_media m
           JOIN sunsensor_new_catalog_items i ON i.id = m.item_id
          WHERE m.id = ? AND m.item_id = ? AND m.status = 'ready' LIMIT 1`,
        [mediaId, id],
      );
      if (!readyRows.length) {
        response.status(409).json({ error: "Media is no longer available for publication" });
        return;
      }
      response.json({ media: { id: mediaId, status: "ready" } });
    } catch {
      response.status(503).json({ error: "Could not complete media upload" });
    }
  });

  app.delete("/api/staff/items/:id/media/:mediaId", staffOnly, async (request, response) => {
    const id = itemId(request.params.id);
    const mediaId = itemId(request.params.mediaId);
    if (!id || !mediaId) return sendBadRequest(response, "Invalid media identifier");
    try {
      const [result] = await pool.execute(
        `UPDATE sunsensor_new_catalog_media m
           JOIN sunsensor_new_catalog_items i ON i.id = m.item_id
            SET m.status = 'hidden'
          WHERE m.id = ? AND m.item_id = ? AND m.status <> 'hidden'`,
        [mediaId, id],
      );
      if ((result as { affectedRows: number }).affectedRows === 0) {
        response.status(404).json({ error: "Media upload not found" });
        return;
      }
      response.json({ media: { id: mediaId, status: "hidden" } });
    } catch {
      response.status(503).json({ error: "Could not hide catalog media" });
    }
  });
}
