import { useState } from "react";
import { ArrowLeft, Check, Play, ShoppingBag } from "lucide-react";
import { Link, useCart } from "../context";
import { formatKsh } from "../data/products";
import type { PublicStaffCatalogItem } from "../data/catalogContext";

export function StaffProductPage({ item }: { item: PublicStaffCatalogItem }) {
  const { addStaffItem } = useCart();
  const [selectedMediaId, setSelectedMediaId] = useState(item.media[0]?.id ?? "");
  const [added, setAdded] = useState(false);
  const readyMedia = item.media
    .filter((media) => media.uploadStatus === "ready")
  const selectedMedia =
    readyMedia.find((media) => media.id === selectedMediaId) ?? readyMedia[0];

  const add = () => {
    addStaffItem(item, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  if (!selectedMedia) {
    return (
      <section className="staff-product-empty container section-pad" role="status">
        <h1>This listing is being updated.</h1>
        <p>Browse the public SunSensor offers while the shop refreshes this item.</p>
        <Link className="button button-dark" to="/shop">
          <ArrowLeft size={16} /> Back to shop
        </Link>
      </section>
    );
  }

  return (
    <>
      <div className="breadcrumb-row container">
        <Link to="/shop">
          <ArrowLeft size={14} /> Back to the shop
        </Link>
        <span>NEW SUNSENSOR LISTING · {item.itemType.toUpperCase()}</span>
      </div>
      <section className="staff-product-detail container">
        <div className="staff-product-gallery">
          <div className="staff-product-hero-media">
            {selectedMedia.mediaType === "video" ? (
              <video
                key={selectedMedia.id}
                src={selectedMedia.url}
                controls
                playsInline
                preload="metadata"
                aria-label={`${item.name} video`}
              />
            ) : (
              <img
                key={selectedMedia.id}
                src={selectedMedia.url}
                alt={selectedMedia.fileName || `${item.name} · ${item.itemType.toLowerCase()}`}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            )}
            <span className="staff-product-category">{item.itemType}</span>
          </div>
          {readyMedia.length > 1 && (
            <div className="staff-product-thumbnails" aria-label="More listing media">
              {readyMedia.map((media, index) => (
                <button
                  type="button"
                  className={media.id === selectedMedia.id ? "active" : ""}
                  key={media.id}
                  onClick={() => setSelectedMediaId(media.id)}
                  aria-label={`Show ${media.mediaType} ${index + 1} of ${readyMedia.length}`}
                  aria-pressed={media.id === selectedMedia.id}
                >
                  {media.mediaType === "video" ? (
                    <span className="staff-thumbnail-video"><Play size={18} fill="currentColor" /></span>
                  ) : (
                    <img
                      src={media.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
          <p className="staff-product-media-note">
            Shared by SunSensor staff. Video playback starts only when you choose to play it.
          </p>
        </div>

        <div className="staff-product-copy">
          <span className="eyebrow"><span className="eyebrow-dot" />NEW IN THE SHOP · {item.itemType.toUpperCase()}</span>
          <h1>{item.name}</h1>
          {item.description && <p className="staff-product-description">{item.description}</p>}
          <div className="staff-product-price">
            <span>PRICE SET BY SUNSENSOR</span>
            <strong>{formatKsh(item.priceKsh)}</strong>
            <small>Confirm availability with the shop before ordering.</small>
          </div>
          <button
            type="button"
            className="button button-dark staff-product-add"
            onClick={add}
          >
            {added ? "Added to your bag" : "Add to bag"}
            {added ? <Check size={17} /> : <ShoppingBag size={17} />}
          </button>
          <p className="staff-product-order-note">
            Your bag prepares a WhatsApp inquiry. SunSensor confirms availability and order details directly.
          </p>
          <div className="staff-product-note">
            <strong>New shop listing</strong>
            <p>This item and its price were added by authorized SunSensor staff. Existing social-post offers remain separate.</p>
          </div>
        </div>
      </section>
    </>
  );
}
