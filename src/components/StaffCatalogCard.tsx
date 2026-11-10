import { useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Play, Plus } from "lucide-react";
import { Link, useCart } from "../context";
import { formatKsh } from "../data/products";
import type { PublicStaffCatalogItem } from "../data/catalogContext";

export function StaffCatalogCard({
  item,
  index = 0,
}: {
  item: PublicStaffCatalogItem;
  index?: number;
}) {
  const { addStaffItem } = useCart();
  const [added, setAdded] = useState(false);
  const media =
    item.media.find((candidate) => candidate.mediaType === "image") ??
    item.media[0];

  const onAdd = () => {
    addStaffItem(item);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <motion.article
      className="product-card staff-catalog-card"
      initial={false}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/product/${item.slug}`}
        className="product-card-link"
        aria-label={`View ${item.itemType.toLowerCase()} listing ${item.name}`}
      >
        <div className="product-image product-image-staff">
          {media.mediaType === "image" ? (
            <motion.img
              src={media.url}
              alt={`${item.name} · ${item.itemType.toLowerCase()}`}
              loading="lazy"
              decoding="async"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : (
            <div className="staff-video-card-mark" aria-hidden="true">
              <span><Play size={21} fill="currentColor" /></span>
              <small>Video · view listing</small>
            </div>
          )}
          <span className="product-badge">
            NEW {item.itemType.toUpperCase()}
          </span>
          <span className="image-arrow" aria-hidden="true">
            <ArrowUpRight size={17} />
          </span>
        </div>
      </Link>
      <div className="product-image-source staff-item-source">
        <span>NEW LISTING</span>
        <span>Added by SunSensor staff</span>
      </div>
      <div className="product-card-info">
        <div className="product-card-label-row">
          <span className="product-family">SunSensor · {item.itemType}</span>
          <span className="product-posted">SHOP LISTING</span>
        </div>
        <Link to={`/product/${item.slug}`} className="product-name-link">
          <h3>{item.name}</h3>
        </Link>
        <div className="product-card-price-row">
          <strong>{formatKsh(item.priceKsh)}</strong>
          <span>shop price</span>
        </div>
        <p className="product-price-caveat">
          Price set by SunSensor staff. Confirm availability.
        </p>
        <button
          type="button"
          className={`quick-add ${added ? "quick-add-added" : ""}`}
          onClick={onAdd}
          aria-label={`Add ${item.name} to bag`}
        >
          <span>{added ? "Added to bag" : "Add to bag"}</span>
          {added ? <span aria-hidden="true">✓</span> : <Plus size={16} />}
        </button>
      </div>
    </motion.article>
  );
}
