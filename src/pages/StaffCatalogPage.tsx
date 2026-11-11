import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Camera,
  Check,
  CircleHelp,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import {
  createStaffItem,
  deleteStaffMedia,
  getStaffItems,
  getStaffSession,
  logoutStaff,
  publishStaffItem,
  StaffApiError,
  startGoogleSignIn,
  unpublishStaffItem,
  updateStaffItem,
  uploadStaffMedia,
  type StaffItemFields,
} from "../data/staffCatalogApi";
import type {
  StaffCatalogItem,
  StaffCatalogItemType,
  StaffSession,
} from "../types/catalog";
import "../staff.css";

type PendingMedia = {
  key: string;
  file: File;
  previewUrl: string;
  mediaType: "image" | "video";
};

type PageState = "loading" | "signed-out" | "unauthorized" | "error" | "ready";

type Fields = {
  itemType: StaffCatalogItemType;
  name: string;
  description: string;
  price: string;
};

const initialFields: Fields = {
  itemType: "Frame",
  name: "",
  description: "",
  price: "",
};

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const IMAGE_MAX_BYTES = 24 * 1024 * 1024;
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

function formatPrice(price: number | null) {
  return price === null
    ? "Price not set"
    : `KSh ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(price)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof StaffApiError) return error.message;
  return "Something went wrong. Please try again.";
}

function messageForPageError(error: unknown) {
  if (error instanceof StaffApiError && error.status === 403) return "unauthorized";
  return "error";
}

export function StaffCatalogPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [items, setItems] = useState<StaffCatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>(initialFields);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const pendingMediaRef = useRef<PendingMedia[]>([]);
  const [busy, setBusy] = useState<"auth" | "logout" | "save" | "publish" | "unpublish" | "delete" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );
  const readyMediaCount =
    (selectedItem?.media.filter((media) => media.uploadStatus === "ready").length ?? 0) +
    pendingMedia.length;

  useEffect(() => {
    let active = true;
    async function loadSession() {
      setPageState("loading");
      setErrorMessage("");
      try {
        const currentStaff = await getStaffSession();
        if (!active) return;
        setStaff(currentStaff);
        const currentItems = await getStaffItems();
        if (!active) return;
        setItems(currentItems);
        setPageState("ready");
      } catch (error) {
        if (!active) return;
        if (error instanceof StaffApiError && error.status === 401) {
          setStaff(null);
          setPageState("signed-out");
        } else {
          setErrorMessage(getErrorMessage(error));
          setPageState(messageForPageError(error));
        }
      }
    }
    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    pendingMediaRef.current = pendingMedia;
  }, [pendingMedia]);

  useEffect(
    () => () => pendingMediaRef.current.forEach((media) => URL.revokeObjectURL(media.previewUrl)),
    [],
  );

  function clearPendingMedia() {
    pendingMediaRef.current.forEach((media) => URL.revokeObjectURL(media.previewUrl));
    pendingMediaRef.current = [];
    setPendingMedia([]);
  }

  function startNewItem() {
    clearPendingMedia();
    setSelectedId(null);
    setFields(initialFields);
    setErrorMessage("");
    setNotice("");
    setUploadStatus("");
    setFormMessage("");
  }

  function selectItem(item: StaffCatalogItem) {
    clearPendingMedia();
    setSelectedId(item.id);
    setFields({
      itemType: item.itemType,
      name: item.name ?? "",
      description: item.description ?? "",
      price: item.priceKsh === null ? "" : String(item.priceKsh),
    });
    setErrorMessage("");
    setNotice("");
    setUploadStatus("");
    setFormMessage("");
  }

  function setField<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setFormMessage("");
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const next: PendingMedia[] = [];
    const rejected: string[] = [];
    Array.from(fileList).forEach((file) => {
      const isImage = IMAGE_MIMES.has(file.type);
      const isVideo = VIDEO_MIMES.has(file.type);
      const maxSize = isImage ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
      if (!isImage && !isVideo) {
        rejected.push(`${file.name}: choose a JPEG, PNG, WebP, MP4, WebM or QuickTime file.`);
        return;
      }
      if (file.size > maxSize) {
        rejected.push(`${file.name}: file exceeds the ${isImage ? "24 MiB image" : "100 MiB video"} limit.`);
        return;
      }
      next.push({
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        mediaType: isImage ? "image" : "video",
      });
    });
    if (next.length) {
      pendingMediaRef.current = [...pendingMediaRef.current, ...next];
      setPendingMedia(pendingMediaRef.current);
    }
    setErrorMessage(rejected.join(" "));
  }

  function removePending(key: string) {
    const removed = pendingMediaRef.current.find((media) => media.key === key);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    pendingMediaRef.current = pendingMediaRef.current.filter((media) => media.key !== key);
    setPendingMedia(pendingMediaRef.current);
  }

  function fieldsForRequest(): StaffItemFields | null {
    const trimmedPrice = fields.price.trim();
    const price = trimmedPrice ? Number(trimmedPrice) : null;
    if (trimmedPrice && (!Number.isSafeInteger(price) || price === null || price <= 0)) {
      setFormMessage("Enter a positive whole-KSh price, or leave it blank for an incomplete draft.");
      return null;
    }
    return {
      itemType: fields.itemType,
      name: fields.name.trim() || null,
      description: fields.description.trim() || null,
      priceKsh: price,
    };
  }

  async function persistAndUpload(): Promise<StaffCatalogItem | null> {
    const data = fieldsForRequest();
    if (!data) return null;
    let savedItem: StaffCatalogItem;
    try {
      savedItem = selectedId
        ? await updateStaffItem(selectedId, data)
        : await createStaffItem(data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    }

    setSelectedId(savedItem.id);
    setItems((current) => [savedItem, ...current.filter((item) => item.id !== savedItem.id)]);
    let uploadedCount = 0;
    for (const media of pendingMedia) {
      try {
        setUploadStatus(`Uploading ${media.file.name} · 0%`);
        await uploadStaffMedia(savedItem.id, media.file, (loaded, total) => {
          const percent = total ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
          setUploadStatus(`Uploading ${media.file.name} · ${percent}%`);
        });
        uploadedCount += 1;
        URL.revokeObjectURL(media.previewUrl);
        pendingMediaRef.current = pendingMediaRef.current.filter((item) => item.key !== media.key);
        setPendingMedia(pendingMediaRef.current);
        setUploadStatus(`${media.file.name} uploaded`);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
        setUploadStatus(`Upload stopped at ${media.file.name}. Try again; this item was not published.`);
        return null;
      }
    }
    if (uploadedCount) {
      try {
        const refreshed = await getStaffItems();
        setItems(refreshed);
        savedItem = refreshed.find((item) => item.id === savedItem.id) ?? savedItem;
      } catch (error) {
        setErrorMessage(`Media uploaded, but the latest listing could not be reloaded. ${getErrorMessage(error)}`);
        return null;
      }
    }
    setItems((current) => [savedItem, ...current.filter((item) => item.id !== savedItem.id)]);
    setUploadStatus("");
    return savedItem;
  }

  async function handleSave() {
    setBusy("save");
    setErrorMessage("");
    setNotice("");
    setFormMessage("");
    const savedItem = await persistAndUpload();
    if (savedItem) {
      setNotice(savedItem.status === "published"
        ? "Changes saved. This listing remains published until you choose Unpublish."
        : "Draft saved. It remains unpublished until you choose Publish.");
    }
    setBusy(null);
  }

  function publishIssues(item: StaffCatalogItem) {
    const issues: string[] = [];
    if (!item.name?.trim()) issues.push("Add a name");
    if (!item.itemType) issues.push("Choose a type");
    if (item.priceKsh === null || item.priceKsh <= 0 || !Number.isInteger(item.priceKsh)) issues.push("Enter a positive whole-KSh price");
    if (!item.media.some((media) => media.uploadStatus === "ready")) issues.push("Upload at least one photo or video");
    return issues;
  }

  async function handlePublish() {
    setBusy("publish");
    setErrorMessage("");
    setNotice("");
    setFormMessage("");
    const savedItem = await persistAndUpload();
    if (!savedItem) {
      setBusy(null);
      return;
    }
    const issues = publishIssues(savedItem);
    if (issues.length) {
      setFormMessage(`To publish: ${issues.join(" · ")}.`);
      setBusy(null);
      return;
    }
    try {
      const published = await publishStaffItem(savedItem.id);
      setItems((current) => [published, ...current.filter((item) => item.id !== published.id)]);
      setNotice("Listing published.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
    setBusy(null);
  }

  async function handleUnpublish() {
    if (!selectedItem) return;
    setBusy("unpublish");
    setErrorMessage("");
    setNotice("");
    try {
      const draft = await unpublishStaffItem(selectedItem.id);
      setItems((current) => [draft, ...current.filter((item) => item.id !== draft.id)]);
      setNotice("Listing unpublished. It is now a draft and no longer appears in the public shop.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
    setBusy(null);
  }

  async function handleDeleteMedia(mediaId: string, fileName: string) {
    if (!selectedItem || !window.confirm(`Remove “${fileName}” from this listing?`)) return;
    setBusy("delete");
    setErrorMessage("");
    setNotice("");
    try {
      await deleteStaffMedia(selectedItem.id, mediaId);
      const refreshed = await getStaffItems();
      setItems(refreshed);
      setNotice("Media removed from this listing.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
    setBusy(null);
  }

  async function handleSignIn() {
    setBusy("auth");
    setErrorMessage("");
    try {
      const authorizationUrl = await startGoogleSignIn();
      const parsed = new URL(authorizationUrl, window.location.origin);
      if (parsed.protocol !== "https:" && parsed.origin !== window.location.origin) {
        throw new Error("The sign-in service returned an unsafe address.");
      }
      window.location.assign(parsed.href);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setBusy(null);
    }
  }

  async function handleLogout() {
    setBusy("logout");
    setErrorMessage("");
    try {
      await logoutStaff();
      setStaff(null);
      setItems([]);
      setSelectedId(null);
      clearPendingMedia();
      setPageState("signed-out");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
    setBusy(null);
  }

  async function retryLoad() {
    setPageState("loading");
    setErrorMessage("");
    try {
      const currentStaff = await getStaffSession();
      setStaff(currentStaff);
      const currentItems = await getStaffItems();
      setItems(currentItems);
      setPageState("ready");
    } catch (error) {
      if (error instanceof StaffApiError && error.status === 401) {
        setStaff(null);
        setPageState("signed-out");
      } else {
        setErrorMessage(getErrorMessage(error));
        setPageState(messageForPageError(error));
      }
    }
  }

  return (
    <div className="staff-page">
      <header className="staff-topbar">
        <a className="staff-back-link" href="/shop"><ArrowLeft size={17} /> Public shop</a>
        <span className="staff-lock"><ShieldCheck size={16} /> Private staff area</span>
      </header>
      <div className="staff-wrap">
        <div className="staff-heading">
          <div>
            <span className="staff-eyebrow">SUNSENSOR · CATALOGUE</span>
            <h1>Staff listing manager</h1>
            <p>Create and manage new Frame and Lens listings. Existing source-backed offers are not editable here.</p>
          </div>
          <a className="staff-shop-link" href="/shop">View public shop <ArrowUpRight size={15} /></a>
        </div>

        {pageState === "loading" && (
          <section className="staff-state-card" aria-live="polite"><LoaderCircle className="staff-spin" size={23} /> Checking staff session…</section>
        )}
        {pageState === "signed-out" && (
          <section className="staff-auth-card">
            <div className="staff-auth-icon"><ShieldCheck size={24} /></div>
            <div><span className="staff-eyebrow">STAFF SIGN-IN</span><h2>Sign in to manage listings</h2><p>Continue with Google. Only accounts authorized by the shop can access this private editor.</p></div>
            {errorMessage && <div className="staff-alert" role="alert"><AlertCircle size={17} />{errorMessage}</div>}
            <button className="staff-button staff-button-primary staff-auth-button" type="button" onClick={handleSignIn} disabled={busy === "auth"}>
              {busy === "auth" ? <LoaderCircle className="staff-spin" size={18} /> : <ShieldCheck size={18} />} Continue with Google
            </button>
          </section>
        )}
        {pageState === "unauthorized" && (
          <section className="staff-state-card staff-state-card-error" role="alert"><AlertCircle size={22} /><div><h2>Staff access not authorized</h2><p>This Google account does not have permission to manage the catalogue. Contact the shop administrator if you believe this is an error.</p><button className="staff-button staff-button-secondary" type="button" onClick={handleSignIn} disabled={busy === "auth"}>Try another Google account</button></div></section>
        )}
        {pageState === "error" && (
          <section className="staff-state-card staff-state-card-error" role="alert"><AlertCircle size={22} /><div><h2>Staff area unavailable</h2><p>{errorMessage}</p><button className="staff-button staff-button-secondary" type="button" onClick={retryLoad}>Try again</button></div></section>
        )}

        {pageState === "ready" && (
          <>
            <section className="staff-account-bar" aria-label="Signed-in staff account">
              <div className="staff-account-mark">{staff?.name?.trim().slice(0, 1).toUpperCase() || "S"}</div>
              <div className="staff-account-copy"><strong>{staff?.name}</strong><span>{staff?.email}</span></div>
              <span className="staff-account-authorized"><BadgeCheck size={15} /> Authorized</span>
              <button className="staff-logout" type="button" onClick={handleLogout} disabled={busy === "logout"}>
                {busy === "logout" ? <LoaderCircle className="staff-spin" size={16} /> : <LogOut size={16} />} Sign out
              </button>
            </section>

            {errorMessage && <div className="staff-alert staff-global-alert" role="alert"><AlertCircle size={17} />{errorMessage}</div>}
            {notice && <div className="staff-notice" role="status"><Check size={17} />{notice}</div>}

            <div className="staff-workspace">
              <aside className="staff-list-panel" aria-label="Your listings">
                <div className="staff-panel-heading">
                  <div><span className="staff-eyebrow">YOUR CATALOGUE</span><h2>Listings <span>{items.length}</span></h2></div>
                  <button className="staff-icon-button" type="button" aria-label="Create a new listing" onClick={startNewItem}><Plus size={20} /></button>
                </div>
                <button className="staff-button staff-new-button" type="button" onClick={startNewItem}><Plus size={17} /> New listing</button>
                {items.length === 0 ? (
                  <div className="staff-empty-list"><CircleHelp size={20} /><p>No staff listings yet. Start with a draft; you can publish it when the details and media are ready.</p></div>
                ) : (
                  <ul className="staff-list">
                    {items.map((item) => (
                      <li key={item.id}>
                        <button className={`staff-list-item${selectedId === item.id ? " is-selected" : ""}`} type="button" onClick={() => selectItem(item)} aria-current={selectedId === item.id ? "true" : undefined}>
                          <span className={`staff-status-dot ${item.status}`} aria-hidden="true" />
                          <span className="staff-item-summary"><strong>{item.name?.trim() || "Untitled draft"}</strong><span>{item.itemType} <i>·</i> {formatPrice(item.priceKsh)}</span></span>
                          <span className={`staff-status-label ${item.status}`}>{item.status === "published" ? "Published" : "Draft"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="staff-legacy-note"><ShieldCheck size={15} /> Only new staff-created listings appear here. Legacy shop offers remain unchanged.</p>
              </aside>

              <section className="staff-editor" aria-label={selectedItem ? "Edit listing" : "New listing"}>
                <div className="staff-editor-heading">
                  <div><span className="staff-eyebrow">{selectedItem ? "EDIT LISTING" : "NEW LISTING"}</span><h2>{selectedItem?.name?.trim() || (selectedItem ? "Untitled draft" : "Create a listing")}</h2></div>
                  {selectedItem && <span className={`staff-status-pill ${selectedItem.status}`}><span className="staff-status-dot" />{selectedItem.status === "published" ? "Published" : "Draft"}</span>}
                </div>
                <p className="staff-editor-intro">A draft can be incomplete and stays private. Publish only when the listing has a name, type, positive price and at least one uploaded photo or video.</p>

                <div className="staff-form-grid">
                  <label className="staff-field staff-field-type" htmlFor="staff-item-type"><span>Listing type <b aria-hidden="true">*</b></span>
                    <select id="staff-item-type" value={fields.itemType} onChange={(event) => setField("itemType", event.target.value as StaffCatalogItemType)}>
                      <option value="Frame">Frame</option><option value="Lens">Lens</option>
                    </select>
                  </label>
                  <label className="staff-field staff-field-name" htmlFor="staff-name"><span>Name</span>
                    <input id="staff-name" type="text" maxLength={120} value={fields.name} onChange={(event) => setField("name", event.target.value)} placeholder="e.g. Everyday acetate frame" autoComplete="off" />
                  </label>
                  <label className="staff-field staff-field-description" htmlFor="staff-description"><span>Description <small>Optional</small></span>
                    <textarea id="staff-description" rows={4} maxLength={2500} value={fields.description} onChange={(event) => setField("description", event.target.value)} placeholder="Share useful product details for customers." />
                  </label>
                  <label className="staff-field staff-field-price" htmlFor="staff-price"><span>Price <b aria-hidden="true">*</b></span>
                    <div className="staff-price-input"><span>KSh</span><input id="staff-price" type="number" inputMode="numeric" min="0" step="1" value={fields.price} onChange={(event) => setField("price", event.target.value)} placeholder="0" /></div>
                    <small>One price per listing. Leave blank on an incomplete draft.</small>
                  </label>
                </div>

                <fieldset className="staff-media-section">
                  <legend>Photos &amp; videos</legend>
                  <p className="staff-media-guidance">Images: JPEG, PNG or WebP · up to 24 MiB each. Videos: MP4, WebM or QuickTime · up to 100 MiB each. You can add more than one file.</p>
                  <div className="staff-media-buttons">
                    <label className="staff-upload-choice"><Camera size={19} /><span><strong>Take a photo</strong><small>Use your device camera</small></span><input aria-label="Capture a product photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} /></label>
                    <label className="staff-upload-choice"><Video size={19} /><span><strong>Record a video</strong><small>Use your device camera</small></span><input aria-label="Record a product video" type="file" accept="video/mp4,video/webm,video/quicktime" capture="environment" onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} /></label>
                    <label className="staff-upload-choice"><ImagePlus size={19} /><span><strong>Choose files</strong><small>Photos and videos · multiple</small></span><input aria-label="Choose product photos and videos" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} /></label>
                  </div>
                  <p className="staff-upload-timing"><Upload size={14} /> Files upload only after you press Save draft or Publish.</p>
                  {(selectedItem?.media.length || pendingMedia.length) ? (
                    <div className="staff-media-grid" aria-label="Listing media">
                      {selectedItem?.media.map((media) => (
                        <div className="staff-media-card" key={`existing-${media.id}`}>
                          {media.mediaType === "video" ? <video src={media.url} controls preload="metadata" aria-label={media.fileName} /> : <img src={media.url} alt={media.fileName} />}
                          <div className="staff-media-caption"><span>{media.fileName}</span><small className={media.uploadStatus}>{media.uploadStatus === "ready" ? "Ready" : "Upload pending"}</small></div>
                          <button className="staff-media-delete" type="button" onClick={() => handleDeleteMedia(media.id, media.fileName)} disabled={busy !== null} aria-label={`Remove ${media.fileName} from this listing`}><Trash2 size={14} /> Remove</button>
                        </div>
                      ))}
                      {pendingMedia.map((media) => (
                        <div className="staff-media-card staff-media-pending" key={media.key}>
                          {media.mediaType === "video" ? <video src={media.previewUrl} controls preload="metadata" aria-label={`Preview ${media.file.name}`} /> : <img src={media.previewUrl} alt={`Preview ${media.file.name}`} />}
                          <div className="staff-media-caption"><span>{media.file.name}</span><small>Ready to upload</small></div>
                          <button className="staff-media-remove" type="button" onClick={() => removePending(media.key)} aria-label={`Remove ${media.file.name} before upload`}><X size={15} /></button>
                        </div>
                      ))}
                    </div>
                  ) : <div className="staff-no-media"><ImagePlus size={20} />No media added yet.</div>}
                  {uploadStatus && <p className="staff-upload-status" role="status"><LoaderCircle className="staff-spin" size={15} />{uploadStatus}</p>}
                </fieldset>

                {formMessage && <div className="staff-form-message" role="alert"><AlertCircle size={17} />{formMessage}</div>}
                <div className="staff-action-row">
                  <button className="staff-button staff-button-secondary" type="button" onClick={handleSave} disabled={busy !== null}>
                    {busy === "save" ? <LoaderCircle className="staff-spin" size={17} /> : <Save size={17} />} {selectedItem?.status === "published" ? "Save changes" : "Save draft"}
                  </button>
                  <button className="staff-button staff-button-primary" type="button" onClick={handlePublish} disabled={busy !== null}>
                    {busy === "publish" ? <LoaderCircle className="staff-spin" size={17} /> : <Send size={17} />} Publish
                  </button>
                  {selectedItem?.status === "published" && <button className="staff-button staff-button-unpublish" type="button" onClick={handleUnpublish} disabled={busy !== null}>{busy === "unpublish" ? <LoaderCircle className="staff-spin" size={17} /> : <X size={17} />} Unpublish</button>}
                </div>
                <div className="staff-editor-footnote" role="status"><Check size={15} /> {readyMediaCount} media item{readyMediaCount === 1 ? "" : "s"} ready or selected · Nothing publishes without your explicit action.</div>
              </section>
            </div>
            <footer className="staff-footer"><span>SunSensor staff editor</span><a href="/shop">Back to public shop <ArrowUpRight size={14} /></a></footer>
          </>
        )}
      </div>
    </div>
  );
}
