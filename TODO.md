# TODO

## Real SunSensor catalog and product information
- [x] Create a refined SunSensor Eyewear homepage and customer-facing product catalog that introduces the brand, highlights key products, and uses accurate product names, imagery, prices, color or lens options, and availability from the actual SunSensor Eyewear shop.
- [x] Provide detailed product pages with verified frame dimensions, lens technology, materials, included items, care details, and variant selection. Do not invent specifications that the shop does not publish; identify unavailable details as unconfirmed and direct customers to ask the shop.
- [x] Explain SunSensor lens behavior in plain language, including how the eyewear responds to changing light conditions and practical customer benefits.

Evidence: `src/data/products.ts` contains four dated shop-post offers and original source links. Every product page distinguishes posted facts from unavailable dimensions, accessories, care, material or live stock. No fabricated models, colors, sizes, protection ratings or named lens brands are offered. Customers can describe their exact frame/lens request rather than select invented stock variants. General photochromatic behavior is educational, not a guarantee for a SunSensor model. Sources are documented in `research/shop-facts.md`.

## Shop journey and business information
- [x] Provide a shop-ready cart and checkout journey with clear pricing, selected variants, quantity controls, and mobile-friendly interactions.
- [x] Include trust-building storefront content grounded in the real business, including shipping, returns, contact information, FAQs, and relevant policy links; avoid presenting unverified policies as fact.

Evidence: the persistent bag stores product selections, requested style details and quantities, and shows a subtotal calculated from the dated posted prices. Checkout prepares a WhatsApp inquiry to the verified shop phone; it does not take payment or claim an order was placed. The inquiry requests exact model, fit, lens inclusions, final pricing, stock, delivery and returns terms. FAQs and the footer give the verified Nairobi shop address and real contact/social links. Unpublished delivery, return and refund policies are clearly identified as details to confirm with the shop, not invented links or guarantees.

## Responsive experience and motion
- [x] Improve on the supplied SunSensor reference website with polished page transitions, scroll effects, hover states, and product-media motion that feel smoother without compromising speed or clarity.
- [x] Provide responsive navigation and layouts optimized for desktop, tablet, and mobile, with accessible controls and readable product information.

Evidence: Route transitions, one-time section reveals, image/card hover transitions, and the continuous brand ticker remain. Reduced-motion preferences disable the ticker and section transitions. Scroll-linked hero drift and looping note movement were removed to reduce mobile work while preserving their visual content. TypeScript checks and the production static-render build passed; Preview and the route manifest returned HTTP 200, and original shop photos loaded successfully.

## Mobile layouts and brand presentation
- [x] Preserve the existing blue-and-white branding, product information, actual eyewear photographs, prices, contact details and overall identity.
- [x] Make every page fully responsive on Android and iPhone.
- [x] Use a clean two-column product grid on larger phones and a single-column layout on narrow screens.
- [x] Make product images clear, properly cropped and appropriately sized.
- [x] Remove horizontal scrolling, overlapping elements and unnecessary whitespace.
- [x] Make headings, descriptions and prices easy to read.
- [x] The final result should feel like a premium, modern eyewear shopping experience.

## Mobile navigation and shopping
- [x] Create a compact hamburger navigation menu.
- [x] Add large, comfortable touch-friendly buttons.
- [x] Make the WhatsApp contact button easily accessible.
- [x] Improve the shopping bag experience on mobile.
- [x] Do not remove existing features or replace real product photographs with placeholders.

## Mobile motion and image performance
- [x] Optimise images and animations for faster loading.
- [x] Add smooth, subtle transitions without slowing down the website.

## Responsive device coverage
- [x] Test the website at mobile widths of 320px, 375px, 390px and 430px, as well as tablet and desktop sizes.

Evidence: Playwright tested all nine customer-facing routes (home, catalog, four product details, bag, checkout and FAQ) at 320, 375, 390, 430, 768 and 1280px: 54 page/viewport combinations. Every route returned HTTP 200; document/body widths matched the viewport; all displayed images loaded; and no phone/tablet control was below 44px. The product grid is one column at 320px, two columns from 375px through tablet, and four columns in the desktop catalog. The hamburger drawer spans the viewport and closes with Escape at 320/375px; the WhatsApp control remains in the sticky header without covering content, and 320px header controls do not overlap. Interaction checks added a product to the bag, increased quantity (including line price/subtotal recalculation), removed it, filtered the catalog, and confirmed 16px/52px checkout fields at 430px. Genuine shop photos, prices and verified contact details were retained; source images were already lightweight, so they were not re-exported. Noncritical photos now load lazily/asynchronously with reserved dimensions, while hero/detail photos receive priority. TypeScript checks, static build, route manifest and Preview passed.

## Staff-only new-item access
- [x] Allow only authorized SunSensor staff to sign in to the private `/staff` manager; public visitors cannot create listings or upload media.
- [x] Enforce staff authorization on the server for every create, edit, upload and publish action, and show only published staff additions to public visitors.

Evidence: The unauthenticated Preview request to `/api/staff/items` returned HTTP 401, OAuth initiation returns HTTP 200 from the proxied Preview origin, and source inspection confirms every staff mutation is mounted behind the allowlist/session/CSRF middleware. After the owner's protected allowlist update, OAuth completed and `/staff` displayed the account as Authorized with a Sign out control. The manager saved two explicitly approved test-only records as drafts; authenticated API readback and a fresh `/staff` load confirmed both remain private drafts. The public catalog endpoint returned HTTP 200 with no test entries, and `/shop` still displayed only the four original source-linked offers. No media was uploaded and neither test record was published.

## New frame and lens listings
- [x] Let staff create a new listing of type Frame or Lens with a name, description, one KSh price for that listing, and multiple photos and/or videos.
- [x] On phones, let staff capture new media where the browser supports it or select files from the device; let staff save drafts, preview them, and explicitly publish complete items.
- [x] Require a name, item type, price and at least one media file before publication; staff can later edit or unpublish only staff-created items.

## Public display and continuity
- [x] Show published new frame/lens items and their media and individual prices alongside existing offers; each new frame or lens has its own price.
- [x] Let customers view a published new item, add it to the existing bag, and include its item type and price in the existing WhatsApp inquiry.
- [x] Keep all four existing shop-post listings, photos, source links, displayed prices, contact details, bag and WhatsApp flow unchanged; do not seed, replace, edit or delete existing listings.
- [x] Store new listing and media records durably so drafts, published items and uploaded media persist after a restart.

Evidence: The staff API, editor, published-only catalog context, product detail, bag snapshot and WhatsApp inquiry are wired and type-checked. Additive MySQL tables store staff identities, sessions, listings and media metadata; project object storage holds media bytes. Completion verifies a signed ranged GET, MIME type and total byte count before setting media ready. The legacy product source remains separate and unchanged. Two user-approved internal drafts were saved and read back from the shared database: Frame `TEST ONLY — Frame draft`, KSh 1, ID `d7997a9e-9a2a-4183-99f0-ded5c4090370`; Lens `TEST ONLY — Lens draft`, KSh 2, ID `a744cb5b-89b7-45e1-bc74-678d1fed7f4c`. Both have zero media, status `draft`, and are excluded from `/api/catalog`; `/shop` continues to show only the four legacy offers. No upload, publish, unpublish, edit, or legacy-item mutation was performed. `pnpm check` and the production build passed.

## Shop-data limitations

The business's accessible public channels do not provide a complete live catalog or reliable SKU-level image/specification mapping. Exact models, sizes, color variants, stock, current prices, lens certifications, care, shipping charges and return terms still need merchant confirmation. The delivered site transparently presents social-post listings and an inquiry journey rather than inventing those details. It is not connected to a payment processor or inventory backend.
