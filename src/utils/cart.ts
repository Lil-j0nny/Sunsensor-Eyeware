import type { CartLine, StaffCartSnapshot } from "../context";
import { products } from "../data/products";
import type { StaffCatalogMedia } from "../types/catalog";

export function normalizeCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const knownIds = new Set(products.map((product) => product.id));
  const lines = new Map<string, CartLine>();

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const entry = candidate as Record<string, unknown>;
    if (typeof entry.productId !== "string") continue;
    const staffItem = normalizeStaffSnapshot(entry.staffItem);
    const isLegacyProduct = knownIds.has(entry.productId);
    if (!isLegacyProduct && (!staffItem || entry.productId !== `staff:${staffItem.id}`))
      continue;
    if (
      typeof entry.quantity !== "number" ||
      !Number.isFinite(entry.quantity) ||
      entry.quantity <= 0
    )
      continue;

    const quantity = Math.max(1, Math.min(20, Math.floor(entry.quantity)));
    const request =
      typeof entry.request === "string" ? entry.request.slice(0, 1200) : "";
    const existing = lines.get(entry.productId);
    lines.set(entry.productId, {
      productId: entry.productId,
      quantity: Math.min(20, quantity + (existing?.quantity ?? 0)),
      request: request || existing?.request || "",
      ...(isLegacyProduct
        ? {}
        : { staffItem: staffItem ?? existing?.staffItem }),
    });
  }

  return [...lines.values()];
}

function normalizeStaffSnapshot(value: unknown): StaffCartSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    !candidate.id.trim() ||
    typeof candidate.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate.slug) ||
    (candidate.itemType !== "Frame" && candidate.itemType !== "Lens") ||
    typeof candidate.name !== "string" ||
    !candidate.name.trim() ||
    (candidate.description !== null && typeof candidate.description !== "string") ||
    typeof candidate.priceKsh !== "number" ||
    !Number.isSafeInteger(candidate.priceKsh) ||
    candidate.priceKsh <= 0 ||
    !Array.isArray(candidate.media)
  )
    return null;

  const media = candidate.media.filter(isUsableMedia);
  if (!media.length) return null;

  return {
    id: candidate.id,
    slug: candidate.slug,
    itemType: candidate.itemType,
    name: candidate.name.trim().slice(0, 160),
    description:
      typeof candidate.description === "string"
        ? candidate.description.slice(0, 1600)
        : null,
    priceKsh: candidate.priceKsh,
    media,
  };
}

function isUsableMedia(value: unknown): value is StaffCatalogMedia {
  if (!value || typeof value !== "object") return false;
  const media = value as Record<string, unknown>;
  return (
    typeof media.id === "string" &&
    (media.mediaType === "image" || media.mediaType === "video") &&
    typeof media.url === "string" &&
    media.url.startsWith("/manus-storage/") &&
    typeof media.contentType === "string" &&
    typeof media.fileName === "string" &&
    media.uploadStatus === "ready"
  );
}
