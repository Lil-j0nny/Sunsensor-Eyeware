import type {
  StaffCatalogItem,
  StaffCatalogMedia,
  StaffCatalogMediaType,
  StaffCatalogStatus,
  StaffCatalogUploadStatus,
  StaffCatalogItemType,
  StaffSession,
} from "../types/catalog";

export type StaffItemFields = {
  itemType: StaffCatalogItemType;
  name: string | null;
  description: string | null;
  priceKsh: number | null;
};

export class StaffApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StaffApiError";
    this.status = status;
  }
}

type WireMedia = Partial<StaffCatalogMedia> & {
  type?: StaffCatalogMediaType;
  publicPath?: string | null;
  status?: StaffCatalogUploadStatus | "hidden";
  altText?: string | null;
};

type WireItem = Partial<StaffCatalogItem> & {
  category?: StaffCatalogItemType;
  createdAt?: string;
  media?: WireMedia[];
};

let csrfToken = "";

function normalizeMedia(media: WireMedia[]): StaffCatalogMedia[] {
  return media
    .filter((item) => item.status !== "hidden")
    .map((item) => ({
      id: item.id ?? "",
      mediaType: item.mediaType ?? item.type ?? "image",
      url: item.url ?? item.publicPath ?? "",
      contentType: item.contentType ?? "",
      fileName: item.fileName ?? item.altText ?? "Product media",
      uploadStatus: item.uploadStatus ?? (item.status === "ready" ? "ready" : "pending"),
    }));
}

function normalizeItem(item: WireItem): StaffCatalogItem {
  const status = item.status;
  const normalizedStatus: StaffCatalogStatus = status === "published" ? "published" : "draft";
  return {
    id: item.id ?? "",
    slug: item.slug ?? item.id ?? "",
    itemType: item.itemType ?? item.category ?? "Frame",
    name: item.name ?? null,
    description: item.description ?? null,
    priceKsh: item.priceKsh === undefined ? null : item.priceKsh,
    status: normalizedStatus,
    media: normalizeMedia(item.media ?? []),
  };
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  const method = (init.method ?? "GET").toUpperCase();
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)
          ? { "X-SunSensor-CSRF": csrfToken }
          : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new StaffApiError(
      "Could not connect to the staff service. Check your connection and try again.",
      0,
    );
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body &&
      typeof body.error === "string"
        ? body.error.trim().slice(0, 240)
        : "The request could not be completed. Please try again.";
    throw new StaffApiError(
      message || "The request could not be completed. Please try again.",
      response.status,
    );
  }
  return body as T;
}

async function loadItem(id: string): Promise<StaffCatalogItem> {
  const items = await getStaffItems();
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new StaffApiError("The listing could not be reloaded.", 0);
  return item;
}

export async function getStaffSession(): Promise<StaffSession> {
  csrfToken = "";
  const result = await requestJson<{
    staff: StaffSession;
    csrfToken?: string;
  }>("/api/staff/session");
  csrfToken = result.csrfToken ?? "";
  return {
    name: result.staff.name || result.staff.email.split("@")[0] || "Staff",
    email: result.staff.email,
  };
}

export async function getStaffItems(): Promise<StaffCatalogItem[]> {
  const result = await requestJson<{ items: WireItem[] }>("/api/staff/items");
  return result.items.map(normalizeItem);
}

export async function createStaffItem(
  fields: StaffItemFields,
): Promise<StaffCatalogItem> {
  const result = await requestJson<{ item: WireItem }>("/api/staff/items", {
    method: "POST",
    body: JSON.stringify(fields),
  });
  if (!result.item.id) throw new StaffApiError("The new draft could not be loaded.", 0);
  try {
    return await loadItem(result.item.id);
  } catch {
    return normalizeItem(result.item);
  }
}

export async function updateStaffItem(
  id: string,
  fields: StaffItemFields,
): Promise<StaffCatalogItem> {
  await requestJson<{ item: WireItem }>(`/api/staff/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
  return loadItem(id);
}

export async function publishStaffItem(id: string): Promise<StaffCatalogItem> {
  await requestJson<{ item: Partial<WireItem> }>(
    `/api/staff/items/${encodeURIComponent(id)}/publish`,
    { method: "POST" },
  );
  return loadItem(id);
}

export async function unpublishStaffItem(id: string): Promise<StaffCatalogItem> {
  await requestJson<{ item: Partial<WireItem> }>(
    `/api/staff/items/${encodeURIComponent(id)}/unpublish`,
    { method: "POST" },
  );
  return loadItem(id);
}

export async function deleteStaffMedia(itemId: string, mediaId: string): Promise<void> {
  await requestJson<unknown>(
    `/api/staff/items/${encodeURIComponent(itemId)}/media/${encodeURIComponent(mediaId)}`,
    { method: "DELETE" },
  );
}

export async function startGoogleSignIn(): Promise<string> {
  const result = await requestJson<{ authorizationUrl: string }>(
    "/api/auth/google/start",
    {
      method: "POST",
      body: JSON.stringify({ origin: window.location.origin }),
    },
  );
  return result.authorizationUrl;
}

export async function logoutStaff(): Promise<void> {
  await requestJson<unknown>("/api/auth/logout", { method: "POST" });
  csrfToken = "";
}

export async function uploadStaffMedia(
  itemId: string,
  file: File,
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  const reservation = await requestJson<{
    uploadUrl: string;
    mediaId: string;
    publicPath: string;
  }>(`/api/staff/items/${encodeURIComponent(itemId)}/media`, {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  });

  const uploadStatus = await new Promise<number>((resolve, reject) => {
    // Upload bytes go directly to the signed storage URL, not through the app API.
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", reservation.uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      onProgress(event.loaded, event.lengthComputable ? event.total : file.size);
    };
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => reject(
      new StaffApiError(
        `Could not upload ${file.name}. Check your connection and try again.`,
        0,
      ),
    );
    xhr.onabort = () => reject(new StaffApiError(`Upload cancelled for ${file.name}.`, 0));
    xhr.send(file);
  }).catch((error: unknown) => {
    if (error instanceof StaffApiError) throw error;
    throw new StaffApiError(
      `Could not upload ${file.name}. Check your connection and try again.`,
      0,
    );
  });
  if (uploadStatus < 200 || uploadStatus >= 300) {
    throw new StaffApiError(
      `Could not upload ${file.name}. The storage service rejected the file.`,
      uploadStatus,
    );
  }

  await requestJson<{ media: { id: string; status: "ready" } }>(
    `/api/staff/items/${encodeURIComponent(itemId)}/media/${encodeURIComponent(reservation.mediaId)}/complete`,
    { method: "POST", body: JSON.stringify({ uploaded: true }) },
  );
}
