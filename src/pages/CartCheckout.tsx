import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { Link, useCart } from "../context";
import type { CartLine, StaffCartSnapshot } from "../context";
import { formatKsh, products, shopInfo } from "../data/products";
import type { Product } from "../data/products";
import { Eyebrow } from "../components/Common";

type ResolvedCartLine =
  | { kind: "static"; line: CartLine; product: Product }
  | { kind: "staff"; line: CartLine; staffItem: StaffCartSnapshot };

function resolveCartLines(items: CartLine[]): ResolvedCartLine[] {
  return items.reduce<ResolvedCartLine[]>((resolved, line) => {
    const product = products.find((item) => item.id === line.productId);
    if (product) {
      resolved.push({ kind: "static", line, product });
      return resolved;
    }

    const staffItem = line.staffItem;
    if (staffItem && line.productId === `staff:${staffItem.id}`)
      resolved.push({ kind: "staff", line, staffItem });
    return resolved;
  }, []);
}

function cartLineName(detail: ResolvedCartLine) {
  return detail.kind === "static" ? detail.product.name : detail.staffItem.name;
}

function cartLinePrice(detail: ResolvedCartLine) {
  return detail.kind === "static"
    ? detail.product.price
    : detail.staffItem.priceKsh;
}

function StaffMediaPreview({
  media,
  name,
  summary = false,
}: {
  media: StaffCartSnapshot["media"][number];
  name: string;
  summary?: boolean;
}) {
  if (media.mediaType === "video")
    return (
      <video
        src={media.url}
        controls
        playsInline
        preload="metadata"
        aria-label={`${name} video`}
        style={
          summary
            ? { width: 48, height: 54, objectFit: "cover" }
            : { width: "100%", height: "100%", objectFit: "cover" }
        }
      />
    );
  return (
    <img
      src={media.url}
      alt={media.fileName || `${name} · staff listing`}
      loading="lazy"
      decoding="async"
    />
  );
}

export function CartPage() {
  const { items, updateQuantity, removeItem } = useCart();
  const detail = resolveCartLines(items);
  const subtotal = detail.reduce(
    (sum, item) => sum + cartLinePrice(item) * item.line.quantity,
    0,
  );
  const hasStaffItems = detail.some((item) => item.kind === "staff");
  return (
    <section className="cart-page container section-pad">
      <div className="page-hero-top">
        <Eyebrow>YOUR BAG · ORDER INQUIRY</Eyebrow>
        <span className="page-index">02 — 04</span>
      </div>
      <h1>
        Look good
        <br />
        <em>in your bag.</em>
      </h1>
      {detail.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-bag-icon">
            <ShoppingBag size={34} />
          </div>
          <h2>Your bag is still empty.</h2>
          <p>
            Start with a frame or photochromatic offer from the shop’s public
            posts.
          </p>
          <Link to="/shop" className="button button-dark">
            Browse frames <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            <div className="cart-items-head">
              <span>YOUR SELECTION</span>
              <span>
                {detail.length} listing{detail.length === 1 ? "" : "s"}
              </span>
            </div>
            {detail.map((item) => {
              const { line } = item;
              const name = cartLineName(item);
              const price = cartLinePrice(item);
              const staffMedia =
                item.kind === "staff"
                  ? item.staffItem.media.find(
                      (media) => media.uploadStatus === "ready",
                    )
                  : undefined;
              return (
                <div className="cart-item" key={line.productId}>
                  {item.kind === "static" ? (
                    <Link
                      to={`/product/${item.product.slug}`}
                      className="cart-item-image"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.imageAlt}
                        loading="lazy"
                        decoding="async"
                        width={item.product.imageWidth}
                        height={item.product.imageHeight}
                      />
                    </Link>
                  ) : staffMedia ? (
                    staffMedia.mediaType === "video" ? (
                      <div className="cart-item-image">
                        <StaffMediaPreview media={staffMedia} name={name} />
                      </div>
                    ) : (
                      <Link
                        to={`/product/${item.staffItem.slug}`}
                        className="cart-item-image"
                        aria-label={`View ${item.staffItem.itemType.toLowerCase()} ${name}`}
                      >
                        <StaffMediaPreview media={staffMedia} name={name} />
                      </Link>
                    )
                  ) : (
                    null
                  )}
                  <div className="cart-item-info">
                    <span className="product-family">
                      {item.kind === "static"
                        ? item.product.family
                        : `NEW LISTING · ${item.staffItem.itemType}`}
                    </span>
                    <Link
                      to={`/product/${item.kind === "static" ? item.product.slug : item.staffItem.slug}`}
                    >
                      <h3>{name}</h3>
                    </Link>
                    {item.kind === "static" ? (
                      <span className="cart-post-date">
                        As posted · {item.product.postDate}
                      </span>
                    ) : (
                      <span className="cart-post-date">
                        {item.staffItem.itemType} · Price set by SunSensor
                      </span>
                    )}
                    {line.request && (
                      <p className="cart-request-preview">
                        Request: {line.request}
                      </p>
                    )}
                    <div
                      className="quantity-control"
                      role="group"
                      aria-label={`Quantity for ${name}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(line.productId, line.quantity - 1)
                        }
                        aria-label={`Decrease ${name} quantity, currently ${line.quantity}`}
                        disabled={line.quantity <= 1}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(line.productId, line.quantity + 1)
                        }
                        aria-label={`Increase ${name} quantity, currently ${line.quantity}`}
                        disabled={line.quantity >= 20}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-price">
                    <strong>{formatKsh(price * line.quantity)}</strong>
                    <span>
                      {item.kind === "static"
                        ? "as posted"
                        : `${formatKsh(price)} each · price set by SunSensor`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(line.productId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
            <Link to="/shop" className="continue-shopping">
              <ArrowLeft size={15} /> Continue exploring
            </Link>
          </div>
          <aside className="cart-summary">
            <Eyebrow>ORDER CHECK</Eyebrow>
            <h2>
              Let’s confirm
              <br />
              the details.
            </h2>
            <div className="summary-line">
              <span>
                {hasStaffItems ? "Selection subtotal" : "Posted-price subtotal"}
              </span>
              <strong>{formatKsh(subtotal)}</strong>
            </div>
            <p>
              {hasStaffItems
                ? "Static items use the dated prices shown beside each shop post; staff listings use their displayed prices. Final price, availability, prescription lens costs, fit, delivery and inclusions must be confirmed by SunSensor."
                : "Calculated from the dated prices shown beside each shop post. Final price, availability, prescription lens costs, fit, delivery and inclusions must be confirmed by SunSensor."}
            </p>
            <Link to="/checkout" className="button button-dark summary-button">
              Continue to inquiry <ArrowRight size={17} />
            </Link>
            <div className="summary-reassurance">
              <ShieldCheck size={16} />
              <span>No payment is taken on this website.</span>
            </div>
            <a
              href={shopInfo.whatsappHref}
              className="summary-chat"
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={15} /> Ask the shop first{" "}
              <ArrowUpRight size={14} />
            </a>
          </aside>
        </div>
      )}
    </section>
  );
}

export function CheckoutPage() {
  const { items } = useCart();
  const detail = resolveCartLines(items);
  const subtotal = detail.reduce(
    (sum, item) => sum + cartLinePrice(item) * item.line.quantity,
    0,
  );
  const hasStaffItems = detail.some((item) => item.kind === "staff");
  const [name, setName] = useState("");
  const [lensRequest, setLensRequest] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [inquiryUrl, setInquiryUrl] = useState("");

  const sendInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail.length) return;
    const lines = detail
      .map((item) => {
        const { line } = item;
        if (item.kind === "static")
          return `• ${item.product.name} — ${line.quantity} x ${formatKsh(item.product.price)} (post dated ${item.product.postDate})${line.request ? `\n  Style question: ${line.request}` : ""}`;
        return `• ${item.staffItem.name} — ${item.staffItem.itemType} · ${line.quantity} x ${formatKsh(item.staffItem.priceKsh)} (price set by SunSensor)${line.request ? `\n  Style question: ${line.request}` : ""}`;
      })
      .join("\n");
    const message = [
      "Hello SunSensor Eyewear Opticians, I would like to enquire about this selection:",
      lines,
      `${hasStaffItems ? "Selection subtotal" : "Posted-price subtotal"}: ${formatKsh(subtotal)} (please confirm current prices and what is included).`,
      name ? `Name: ${name}` : "",
      lensRequest ? `Lens / prescription request: ${lensRequest}` : "",
      note ? `Additional note: ${note}` : "",
      "Please confirm exact frame, size, current stock, final price, lens inclusions, delivery options/charges, and returns or exchange terms before payment.",
    ]
      .filter(Boolean)
      .join("\n\n");
    const url = `${shopInfo.whatsappHref}?text=${encodeURIComponent(message)}`;
    setInquiryUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
    setSent(true);
  };

  return (
    <section className="checkout-page container section-pad">
      <div className="page-hero-top">
        <Eyebrow>ORDER INQUIRY · NO ONLINE PAYMENT</Eyebrow>
        <span className="page-index">03 — 04</span>
      </div>
      <h1>
        Almost in
        <br />
        <em>focus.</em>
      </h1>
      {detail.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-bag-icon">
            <Check size={34} />
          </div>
          <h2>
            {sent
              ? "Your WhatsApp order request is ready."
              : "Add a frame to continue."}
          </h2>
          <p>
            {sent
              ? "If WhatsApp did not open, contact SunSensor directly and ask them to confirm the current price, stock and order details."
              : "The cart inquiry starts with a frame selection. Browse shop-posted frames and add one to your bag."}
          </p>
          <Link to="/shop" className="button button-dark">
            Browse frames <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="checkout-grid">
          <form className="checkout-form" onSubmit={sendInquiry}>
            <div className="checkout-step">
              <span className="checkout-step-number">01</span>
              <div>
                <h2>Your details</h2>
                <p>We’ll include these in the WhatsApp message to the shop.</p>
              </div>
            </div>
            <label className="form-field">
              Your name <span>Optional</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name for the optician"
              />
            </label>
            <div className="checkout-step">
              <span className="checkout-step-number">02</span>
              <div>
                <h2>Lens request</h2>
                <p>
                  Prescription lens prices depend on your prescription. No extra
                  price is assumed here.
                </p>
              </div>
            </div>
            <label className="form-field">
              What would you like to ask about?
              <select
                value={lensRequest}
                onChange={(event) => setLensRequest(event.target.value)}
              >
                <option value="">Choose a lens question (optional)</option>
                <option>
                  Prescription lenses — please quote for my prescription
                </option>
                <option>Photochromatic lens option</option>
                <option>Blue-block or anti-glare lens option</option>
                <option>Progressive or bifocal lens option</option>
                <option>
                  Frame only — please confirm whether lenses are included
                </option>
                <option>Other lens question</option>
              </select>
            </label>
            <label className="form-field">
              Anything else for the shop? <span>Optional</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ask about the exact frame, fit, collection or delivery"
                rows={3}
              />
            </label>
            <div className="checkout-disclaimer">
              <ShieldCheck size={18} />
              <p>
                SunSensor’s current stock, full specifications, shipping charges
                and return terms are not synced to this page. Ask the shop to
                confirm them before paying.
              </p>
            </div>
            <button
              type="submit"
              className="button button-dark checkout-submit"
            >
              Prepare WhatsApp inquiry <ArrowUpRight size={17} />
            </button>
            {sent && (
              <p className="checkout-prepared" role="status">
                Your message is ready. If WhatsApp did not open,{" "}
                <a href={inquiryUrl} target="_blank" rel="noreferrer">
                  open your prepared inquiry here
                </a>{" "}
                or call {shopInfo.phoneDisplay}. Review the message and press
                Send in WhatsApp. Your bag stays saved.
              </p>
            )}
          </form>
          <aside className="checkout-summary">
            <Eyebrow>YOUR ORDER REQUEST</Eyebrow>
            <h2>
              {hasStaffItems
                ? `${detail.length} item${detail.length === 1 ? "" : "s"} to ask about`
                : `${detail.length} frame${detail.length === 1 ? "" : "s"} to ask about`}
            </h2>
            {detail.map((item) => {
              const { line } = item;
              const price = cartLinePrice(item);
              const media =
                item.kind === "staff"
                  ? item.staffItem.media.find(
                      (candidate) => candidate.uploadStatus === "ready",
                    )
                  : undefined;
              return (
                <div className="checkout-item" key={line.productId}>
                  {item.kind === "static" ? (
                    <img
                      src={item.product.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={item.product.imageWidth}
                      height={item.product.imageHeight}
                    />
                  ) : media ? (
                    <StaffMediaPreview
                      media={media}
                      name={item.staffItem.name}
                      summary
                    />
                  ) : null}
                  <div>
                    <strong>
                      {item.kind === "static"
                        ? item.product.name
                        : `${item.staffItem.itemType} · ${item.staffItem.name}`}
                    </strong>
                    <small>
                      {line.quantity} × {formatKsh(price)} ·{" "}
                      {item.kind === "static"
                        ? "as posted"
                        : "price set by SunSensor"}
                    </small>
                  </div>
                  <b>{formatKsh(price * line.quantity)}</b>
                </div>
              );
            })}
            <div className="checkout-total">
              <span>
                {hasStaffItems ? "Selection subtotal" : "Posted-price subtotal"}
              </span>
              <strong>{formatKsh(subtotal)}</strong>
            </div>
            <p>
              Not a final quote. No card or mobile-money details are requested
              here.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
