import { useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Plus } from "lucide-react";
import type { Product } from "../data/products";
import { formatKsh } from "../data/products";
import { useCart, Link } from "../context";

export function ProductCard({
  product,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const onAdd = () => {
    addItem(product.id, 1, "");
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  return (
    <motion.article
      className="product-card"
      initial={false}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/product/${product.slug}`}
        className="product-card-link"
        aria-label={`View ${product.name}`}
      >
        <div className={`product-image product-image-${product.id}`}>
          <motion.img
            src={product.image}
            alt={product.imageAlt}
            loading="lazy"
            decoding="async"
            width={product.imageWidth}
            height={product.imageHeight}
            whileHover={{ scale: 1.035 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          />
          <span className="product-badge">
            {product.category === "Photochromatic"
              ? "LIGHT-RESPONSIVE"
              : "FRAME EDIT"}
          </span>
          <span className="image-arrow" aria-hidden="true">
            <ArrowUpRight size={17} />
          </span>
        </div>
      </Link>
      <div className="product-image-source">
        <span>PHOTO SOURCE</span>
        <a
          href={product.imageSourceUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open photo source: ${product.imageSourceLabel}`}
        >
          {product.imageSourceLabel} <ArrowUpRight size={12} />
        </a>
      </div>
      <div className="product-card-info">
        <div className="product-card-label-row">
          <span className="product-family">{product.family}</span>
          <span className="product-posted">
            POSTED {product.postDate.toUpperCase()}
          </span>
        </div>
        <Link to={`/product/${product.slug}`} className="product-name-link">
          <h3>{product.name}</h3>
        </Link>
        <div className="product-card-price-row">
          <strong>{formatKsh(product.price)}</strong>
          <span>as posted</span>
        </div>
        <p className="product-price-caveat">
          Confirm today’s price, stock and what’s included.
        </p>
        <button
          type="button"
          className={`quick-add ${added ? "quick-add-added" : ""}`}
          onClick={onAdd}
          aria-label={`Add ${product.name} to bag`}
        >
          <span>{added ? "Added to bag" : "Add to bag"}</span>
          {added ? <span aria-hidden="true">✓</span> : <Plus size={16} />}
        </button>
      </div>
    </motion.article>
  );
}
