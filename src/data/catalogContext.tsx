import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  StaffCatalogItem,
  StaffCatalogMedia,
} from "../types/catalog";

export type PublicStaffCatalogItem = StaffCatalogItem & {
  name: string;
  priceKsh: number;
  status: "published";
};

type CatalogValue = {
  items: PublicStaffCatalogItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const CatalogContext = createContext<CatalogValue>({
  items: [],
  loading: true,
  error: null,
  refresh: async () => undefined,
});

export function StaffCatalogProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PublicStaffCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/catalog", {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("The new shop listings are unavailable.");
      const payload: unknown = await response.json();
      const received =
        payload && typeof payload === "object" && "items" in payload
          ? (payload as { items?: unknown }).items
          : null;
      if (!Array.isArray(received))
        throw new Error("The shop catalog response was not recognized.");
      setItems(received.filter(isPublicCatalogItem));
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The new shop listings are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ items, loading, error, refresh }),
    [items, loading, error, refresh],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useStaffCatalog() {
  return useContext(CatalogContext);
}

function isPublicCatalogItem(value: unknown): value is PublicStaffCatalogItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StaffCatalogItem>;
  return (
    typeof item.id === "string" &&
    typeof item.slug === "string" &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    (item.description === null || typeof item.description === "string") &&
    (item.itemType === "Frame" || item.itemType === "Lens") &&
    typeof item.priceKsh === "number" &&
    Number.isSafeInteger(item.priceKsh) &&
    item.priceKsh > 0 &&
    item.status === "published" &&
    Array.isArray(item.media) &&
    item.media.some(isReadyMedia)
  );
}

function isReadyMedia(value: unknown): value is StaffCatalogMedia {
  if (!value || typeof value !== "object") return false;
  const media = value as Partial<StaffCatalogMedia>;
  return (
    typeof media.id === "string" &&
    (media.mediaType === "image" || media.mediaType === "video") &&
    typeof media.url === "string" &&
    media.url.startsWith("/manus-storage/") &&
    media.uploadStatus === "ready" &&
    typeof media.contentType === "string" &&
    typeof media.fileName === "string"
  );
}
