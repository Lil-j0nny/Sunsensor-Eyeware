import { products } from "./products";

export const SOCIAL_IMAGE =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519664068478768/NLpukGExGzolfZuN.jpg";

export function seoForPath(
  path: string,
  dynamicItem?: {
    name: string;
    description: string | null;
    itemType: "Frame" | "Lens";
    priceKsh: number;
  },
) {
  const product = path.startsWith("/product/")
    ? products.find((item) => item.slug === path.split("/").pop())
    : undefined;
  if (path === "/staff") {
    return {
      title: "Staff catalog manager — SunSensor Eyewear",
      description: "Private staff area for new SunSensor Frame and Lens listings.",
      type: "website",
      image: SOCIAL_IMAGE,
      noindex: true,
    };
  }
  if (path.startsWith("/product/") && !product && dynamicItem) {
    return {
      title: `${dynamicItem.name} — SunSensor Eyewear`,
      description: `${dynamicItem.itemType} listed by SunSensor staff at KSh ${dynamicItem.priceKsh.toLocaleString("en-KE")}. ${dynamicItem.description ?? "Confirm availability directly with the shop."}`,
      type: "product",
      image: SOCIAL_IMAGE,
      noindex: false,
    };
  }
  if (path.startsWith("/product/") && !product) {
    return {
      title: "Product not found — SunSensor Eyewear",
      description:
        "This SunSensor listing could not be found. Browse the shop’s public frame posts or contact the Nairobi optician.",
      type: "website",
      image: SOCIAL_IMAGE,
      noindex: true,
    };
  }
  if (product) {
    return {
      title: `${product.name} — SunSensor Eyewear`,
      description: `${product.description} Public post price: KSh ${product.price.toLocaleString("en-KE")}. Confirm current stock and details with the shop.`,
      type: "product",
      image: SOCIAL_IMAGE,
      noindex: false,
    };
  }
  const pages: Record<string, { title: string; description: string }> = {
    "/": {
      title: "SunSensor Eyewear — See the world your way",
      description:
        "Explore optical frames and lens services from SunSensor Eyewear Opticians in Nairobi. Prices are dated public posts; confirm stock and details with the shop.",
    },
    "/shop": {
      title: "Shop optical frames — SunSensor Eyewear",
      description:
        "Browse optical frame and photochromatic offers shared by SunSensor Eyewear Opticians in Nairobi. Each listing shows its source post and date.",
    },
    "/faq": {
      title: "Lens services & shop FAQs — SunSensor Eyewear",
      description:
        "Learn about SunSensor’s posted lens services, photochromatic eyewear, Nairobi shop location, contact details and what to confirm before ordering.",
    },
    "/cart": {
      title: "Your bag — SunSensor Eyewear",
      description:
        "Review your selected SunSensor Eyewear shop-post listings and estimated posted-price subtotal before sending an inquiry.",
    },
    "/checkout": {
      title: "Order inquiry — SunSensor Eyewear",
      description:
        "Prepare a WhatsApp order inquiry to SunSensor Eyewear Opticians. Confirm current prices, fit, availability and terms before paying.",
    },
  };
  const page = pages[path] ?? {
    title: "Page not found — SunSensor Eyewear",
    description:
      "This page could not be found. Browse SunSensor Eyewear’s public frame posts or contact the Nairobi optician.",
  };
  return {
    ...page,
    type: "website",
    image: SOCIAL_IMAGE,
    noindex: !pages[path],
  };
}

export function applyClientSeo(
  path: string,
  dynamicItem?: {
    name: string;
    description: string | null;
    itemType: "Frame" | "Lens";
    priceKsh: number;
  },
) {
  const info = seoForPath(path, dynamicItem);
  document.title = info.title;
  setMeta("name", "description", info.description);
  setMeta("property", "og:type", info.type);
  setMeta("property", "og:site_name", "SunSensor Eyewear");
  setMeta("property", "og:title", info.title);
  setMeta("property", "og:description", info.description);
  setMeta("property", "og:image", info.image);
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", info.title);
  setMeta("name", "twitter:description", info.description);
  setMeta("name", "twitter:image", info.image);
  if (info.noindex) setMeta("name", "robots", "noindex,follow");
  else document.querySelector('meta[name="robots"]')?.remove();
  // Canonical and og:url are intentionally omitted until the site's real public domain is selected.
}

function setMeta(kind: "name" | "property", key: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(
    `meta[${kind}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(kind, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}
