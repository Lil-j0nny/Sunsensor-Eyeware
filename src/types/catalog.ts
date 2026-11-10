export type StaffCatalogItemType = "Frame" | "Lens";

export type StaffCatalogStatus = "draft" | "published";

export type StaffCatalogMediaType = "image" | "video";

export type StaffCatalogUploadStatus = "pending" | "ready";

export type StaffCatalogMedia = {
  id: string;
  mediaType: StaffCatalogMediaType;
  url: string;
  contentType: string;
  fileName: string;
  uploadStatus: StaffCatalogUploadStatus;
};

export type StaffCatalogItem = {
  id: string;
  slug: string;
  itemType: StaffCatalogItemType;
  name: string | null;
  description: string | null;
  priceKsh: number | null;
  status: StaffCatalogStatus;
  media: StaffCatalogMedia[];
};

export type StaffSession = {
  name: string;
  email: string;
};
