export type Product = {
  id: string;
  slug: string;
  name: string;
  family: string;
  category: "Frame" | "Photochromatic";
  price: number;
  postDate: string;
  description: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  imageAlt: string;
  imageSourceUrl: string;
  imageSourceLabel: string;
  material: string;
  lens: string;
  measurements: string;
  included: string;
  care: string;
  availability: string;
  sourceLabel: string;
  sourceUrl: string;
  imageNote: string;
};

export const products: Product[] = [
  {
    id: "optical-800",
    slug: "optical-frames-800",
    name: "Optical frames",
    family: "Everyday edit",
    category: "Frame",
    price: 800,
    postDate: "19 Aug 2026",
    description:
      "A shop-posted frame selection for everyday prescription eyewear. Individual frame models, sizes and current stock are not listed online.",
    image: "/manus-storage/official-style-7_2247771b.jpg",
    imageWidth: 1440,
    imageHeight: 1440,
    imageAlt:
      "Black optical frame photographed in SunSensor Eyewear’s official public social feed",
    imageSourceUrl: "https://www.facebook.com/sunsensoreyewear/",
    imageSourceLabel: "SunSensor’s official Facebook feed",
    material: "Not stated for this frame selection.",
    lens: "The shop lists prescription and other lens services. Lens cost depends on the prescription; confirm what this frame price includes.",
    measurements:
      "Frame width, lens width, bridge and temple measurements were not published.",
    included:
      "The public post names optical frames but does not confirm case, cloth or lens inclusions.",
    care: "No product-specific care instructions were published for this selection.",
    availability:
      "Live stock and color options are not connected. Ask the shop to confirm the exact frame before ordering.",
    sourceLabel: "Official Instagram post · 19 Aug 2026",
    sourceUrl:
      "https://www.instagram.com/sunsensor_eyewear_opticals/p/DcOyF6uCI6b/",
    imageNote:
      "Shop-feed image; it illustrates the range and is not a confirmed model/SKU match.",
  },
  {
    id: "optical-1500",
    slug: "optical-frames-1500",
    name: "Optical frames",
    family: "Frame edit",
    category: "Frame",
    price: 1500,
    postDate: "25 Mar 2026",
    description:
      "A different frame price point shown in a public shop post. The shop does not identify this as a single model or provide live color and size options.",
    image: "/manus-storage/official-style-5_ec11d579.jpg",
    imageWidth: 1440,
    imageHeight: 1440,
    imageAlt:
      "A SunSensor social-feed photograph of an optical frame in a dark finish",
    imageSourceUrl: "https://www.facebook.com/sunsensoreyewear/",
    imageSourceLabel: "SunSensor’s official Facebook feed",
    material: "Not stated in the price post.",
    lens: "Prescription lens services are listed separately by the shop; ask for a lens quote based on your prescription.",
    measurements:
      "Frame width, lens width, bridge and temple measurements were not published.",
    included:
      "The public post does not confirm accessories or lens inclusions.",
    care: "No product-specific care instructions were published for this selection.",
    availability:
      "This is a dated public price, not live inventory. Confirm today’s price and exact style with the shop.",
    sourceLabel: "Official Instagram post · 25 Mar 2026",
    sourceUrl: "https://www.instagram.com/p/DWT141ICOjx/",
    imageNote:
      "Shop-feed image; it illustrates a frame style and is not a confirmed model/SKU match.",
  },
  {
    id: "acetate-3000",
    slug: "acetate-optical-frames-3000",
    name: "Acetate optical frames",
    family: "Material edit",
    category: "Frame",
    price: 3000,
    postDate: "17 Aug 2026",
    description:
      "The shop has posted acetate optical frames at this price. No named model, measurements or live stock details were included in the post.",
    image: "/manus-storage/optical3000_d54c6bec.jpg",
    imageWidth: 640,
    imageHeight: 1136,
    imageAlt:
      "Optical frames shown in a SunSensor Eyewear public product video",
    imageSourceUrl:
      "https://www.facebook.com/sunsensoreyewear/videos/optical-frames-at-ksh-3000-each/1898227868233100/",
    imageSourceLabel: "Original SunSensor frame video",
    material:
      "Acetate is named in the shop’s post for this frame selection; confirm the material of the exact frame you choose.",
    lens: "The frame price does not by itself confirm a prescription lens. Ask for the correct lens quote before paying.",
    measurements: "No numeric frame dimensions were published.",
    included: "Accessories and lens inclusions were not stated in the post.",
    care: "No product-specific care instructions were published for this selection.",
    availability:
      "No live inventory is connected. Confirm the exact acetate style and current price with the shop.",
    sourceLabel: "Official Instagram post · 17 Aug 2026",
    sourceUrl:
      "https://www.instagram.com/sunsensor_eyewear_opticals/p/DcI76vTCAm_/",
    imageNote:
      "Official shop video image from a frames post; confirm the exact acetate model before ordering.",
  },
  {
    id: "photochromatic-2000",
    slug: "ready-photochromatic-glasses-2000",
    name: "Ready photochromatic glasses",
    family: "Light-responsive edit",
    category: "Photochromatic",
    price: 2000,
    postDate: "22 Aug 2026",
    description:
      "The shop’s public post lists “ready photochromatic glasses” at this price. Ask the optician about the exact current frame, prescription setup and lens performance.",
    image: "/manus-storage/photochromatic_aad55718.jpg",
    imageWidth: 640,
    imageHeight: 1136,
    imageAlt:
      "Eyeglasses photographed in SunSensor Eyewear’s official social feed; exact offer model requires confirmation",
    imageSourceUrl:
      "https://www.facebook.com/sunsensoreyewear/posts/ready-photochromatic-glasses-at-ksh-2000-/1463169812514039/",
    imageSourceLabel: "Original SunSensor photochromatic post",
    material: "Frame material is not stated for the photochromatic offer.",
    lens: "Photochromatic is named in the offer. Exact tint strength, activation speed, indoor clarity and UV rating are not stated in the post.",
    measurements: "No numeric frame dimensions were published.",
    included:
      "The shop post says “ready photochromatic glasses” at the listed price; confirm what is included and whether custom prescription work costs extra.",
    care: "No product-specific care instructions were published for this offer.",
    availability:
      "The post is dated and stock is not connected. Confirm the current model, price and availability before paying.",
    sourceLabel: "Official Facebook post · 22 Aug 2026",
    sourceUrl:
      "https://www.facebook.com/sunsensoreyewear/posts/ready-photochromatic-glasses-at-ksh-2000-/1463169812514039/",
    imageNote:
      "Photo from SunSensor’s official social feed; ask the shop to confirm the exact current model.",
  },
];

export const lensServices = [
  "Shortsightedness",
  "Longsightedness",
  "Astigmatism",
  "Blue-block",
  "Anti-glare",
  "Photochromatic",
  "Progressive",
  "Bifocal",
];

export const shopInfo = {
  name: "SunSensor Eyewear Opticians",
  phoneDisplay: "+254 720 307081",
  phoneInternational: "254720307081",
  phoneHref: "tel:+254720307081",
  whatsappHref: "https://wa.me/254720307081",
  location:
    "Stewart Building, Ground Floor, Room S6, along Tom Mboya Street near Ronald Ngala junction, opposite Kings Collection, Nairobi.",
  locationNote:
    "Published shop directions — call or WhatsApp to confirm the current location and hours before visiting.",
  facebook: "https://www.facebook.com/sunsensoreyewear/",
  instagram: "https://www.instagram.com/sunsensor_eyewear_opticals/",
  tiktok: "https://www.tiktok.com/@sunsensoreyewear",
  source: "https://www.tiktok.com/@sunsensoreyewear/video/7654956972990713108",
};

export function formatKsh(amount: number) {
  return `KSh ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(amount)}`;
}
