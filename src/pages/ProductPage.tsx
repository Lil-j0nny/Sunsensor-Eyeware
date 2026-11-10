import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ShoppingBag,
} from "lucide-react";
import { Link, useCart } from "../context";
import { formatKsh, products } from "../data/products";
import { Reveal, SectionHeading } from "../components/Shell";
import { Eyebrow, NotFoundPage } from "../components/Common";
import { ProductCard } from "../components/ProductCard";

export function ProductPage({ slug }: { slug: string }) {
  const product = products.find((item) => item.slug === slug);
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [request, setRequest] = useState("");
  if (!product) return <NotFoundPage />;
  const add = () => {
    addItem(product.id, 1, request);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };
  const related = products.filter((item) => item.id !== product.id).slice(0, 2);

  return (
    <>
      <div className="breadcrumb-row container">
        <Link to="/shop">
          <ArrowLeft size={14} /> Back to all frame posts
        </Link>
        <span>PRODUCT NOTE · {product.postDate}</span>
      </div>
      <section className="product-detail container">
        <div className="product-gallery">
          <div className="detail-image">
            <img
              src={product.image}
              alt={product.imageAlt}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width={product.imageWidth}
              height={product.imageHeight}
            />
            <span className="detail-image-caption">{product.imageNote}</span>
          </div>
          <a
            className="detail-image-source"
            href={product.imageSourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Photo source: {product.imageSourceLabel} <ArrowUpRight size={13} />
          </a>
          <div className="source-link-card">
            <span className="source-circle">
              <ArrowUpRight size={18} />
            </span>
            <div>
              <small>ORIGINAL SHOP POST</small>
              <strong>{product.sourceLabel}</strong>
            </div>
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open original shop post"
            >
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
        <div className="product-detail-copy">
          <Eyebrow>
            {product.family.toUpperCase()} · {product.category.toUpperCase()}
          </Eyebrow>
          <h1>
            {product.name}
            <br />
            <em>
              {product.category === "Photochromatic"
                ? "for changing light."
                : "from Nairobi."}
            </em>
          </h1>
          <p className="product-detail-intro">{product.description}</p>
          <div className="price-block">
            <div>
              <span>PRICE IN THE SHOP POST</span>
              <strong>{formatKsh(product.price)}</strong>
              <small>Posted {product.postDate} · not live inventory</small>
            </div>
            <span className="price-status">
              Confirm
              <br />
              today
            </span>
          </div>
          <label className="request-label" htmlFor="style-request">
            Tell the shop what you’d like to confirm <span>Optional</span>
          </label>
          <textarea
            id="style-request"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            placeholder="For example: current black frame options, size, or a prescription lens quote"
            rows={3}
          />
          <button
            type="button"
            className="button button-dark product-add-button"
            onClick={add}
          >
            {added ? "Added to your bag" : "Add to bag"}{" "}
            {added ? <Check size={17} /> : <ShoppingBag size={17} />}
          </button>
          <p className="product-cta-note">
            Your bag prepares an order inquiry. The shop confirms stock and
            final pricing on WhatsApp.
          </p>
          <div className="product-specs">
            <span className="specs-heading">WHAT THE SHOP HAS PUBLISHED</span>
            <SpecRow label="Frame material" value={product.material} />
            <SpecRow label="Lens details" value={product.lens} />
            <SpecRow label="Measurements" value={product.measurements} />
            <SpecRow label="What’s included" value={product.included} />
            <SpecRow label="Care" value={product.care} />
            <SpecRow label="Availability" value={product.availability} />
          </div>
        </div>
      </section>
      <section className="detail-related section-pad">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="MORE FROM THE SHOP FEED"
              title={
                <>
                  A few more
                  <br />
                  <em>frames to explore.</em>
                </>
              }
            >
              <Link
                to="/shop"
                className="round-arrow-link"
                aria-label="Browse all shop posts"
              >
                <ArrowRight size={20} />
              </Link>
            </SectionHeading>
          </Reveal>
          <div className="product-grid">
            {related.map((item, index) => (
              <ProductCard key={item.id} product={item} index={index} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="spec-row">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}
