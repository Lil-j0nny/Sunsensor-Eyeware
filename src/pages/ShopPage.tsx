import { useState } from "react";
import { ArrowUpRight, CircleHelp } from "lucide-react";
import { products, shopInfo } from "../data/products";
import { useStaffCatalog } from "../data/catalogContext";
import { Reveal, SectionHeading } from "../components/Shell";
import { Eyebrow } from "../components/Common";
import { ProductCard } from "../components/ProductCard";
import { StaffCatalogCard } from "../components/StaffCatalogCard";

export function ShopPage() {
  const [category, setCategory] = useState("All frames");
  const [staffCategory, setStaffCategory] = useState("All new items");
  const { items: staffItems } = useStaffCatalog();
  const categories = ["All frames", "Optical frames", "Photochromatic"];
  const staffCategories = ["All new items", "New frames", "New lenses"];
  const visible = products.filter(
    (product) =>
      category === "All frames" ||
      (category === "Photochromatic"
        ? product.category === "Photochromatic"
        : product.category === "Frame"),
  );
  const visibleStaffItems = staffItems.filter(
    (item) =>
      staffCategory === "All new items" ||
      (staffCategory === "New frames"
        ? item.itemType === "Frame"
        : item.itemType === "Lens"),
  );

  return (
    <>
      <section className="page-hero page-hero-shop">
        <div className="container">
          <div className="page-hero-top">
            <Eyebrow>THE SHOP · REAL POSTS, REAL SOURCES</Eyebrow>
            <span className="page-index">01 — 04</span>
          </div>
          <h1>
            Frame the
            <br />
            <em>everyday.</em>
          </h1>
          <div className="page-hero-bottom">
            <p>
              Browse optical frames and lens offers the shop has shared
              publicly. We’ve included post dates and links so you can check the
              original offer.
            </p>
            <span className="price-note">
              <span className="status-dot" /> Posted prices · confirm
              availability
            </span>
          </div>
        </div>
      </section>
      <section className="shop-listing section-pad">
        <div className="container">
          <div className="listing-toolbar">
            <div
              className="filter-tabs"
              role="group"
              aria-label="Filter product listings"
            >
              {categories.map((item) => (
                <button
                  key={item}
                  className={
                    category === item ? "filter-tab active" : "filter-tab"
                  }
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <span role="status" aria-live="polite">
              {visible.length} shop posts
            </span>
          </div>
          <div className="product-grid">
            {visible.map((product, index) => (
              <Reveal key={product.id} delay={(index % 3) * 0.06}>
                <ProductCard product={product} index={index} />
              </Reveal>
            ))}
          </div>
          <div className="listing-note">
            <CircleHelp size={18} />
            <div>
              <strong>These aren’t live stock cards.</strong>
              <p>
                SunSensor has not published a live online inventory, complete
                SKU list, or full measurements. The photos are from the shop’s
                public social feed and may illustrate a range. Confirm exact
                model, color, fit, current price and what’s included by phone or
                WhatsApp.
              </p>
            </div>
            <a href={shopInfo.whatsappHref} target="_blank" rel="noreferrer">
              Ask the shop <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {staffItems.length > 0 && (
        <section className="staff-catalog-section section-pad" id="new-listings">
          <div className="container">
            <Reveal>
              <SectionHeading
                eyebrow="NEW IN THE SHOP · STAFF LISTINGS"
                title={
                  <>
                    Fresh frames.
                    <br />
                    <em>New lens options.</em>
                  </>
                }
                copy="These new items and individual prices were added by SunSensor staff. Select a listing to see its photos or video, then confirm availability with the shop."
              >
                <span className="staff-listing-note">Prices set by SunSensor</span>
              </SectionHeading>
            </Reveal>
            <div className="listing-toolbar staff-listing-toolbar">
              <div
                className="filter-tabs"
                role="group"
                aria-label="Filter new SunSensor listings"
              >
                {staffCategories.map((item) => (
                  <button
                    key={item}
                    className={
                      staffCategory === item ? "filter-tab active" : "filter-tab"
                    }
                    type="button"
                    aria-pressed={staffCategory === item}
                    onClick={() => setStaffCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <span role="status" aria-live="polite">
                {visibleStaffItems.length} new listing
                {visibleStaffItems.length === 1 ? "" : "s"}
              </span>
            </div>
            {visibleStaffItems.length > 0 ? (
              <div className="product-grid">
                {visibleStaffItems.map((item, index) => (
                  <Reveal key={item.id} delay={(index % 3) * 0.04}>
                    <StaffCatalogCard item={item} index={index} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="staff-listing-empty" role="status">
                No {staffCategory === "New frames" ? "frame" : "lens"} listings
                are available in this category yet.
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
