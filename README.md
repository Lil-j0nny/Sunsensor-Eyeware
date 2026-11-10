# SunSensor Eyewear

An editorial, responsive storefront for SunSensor Eyewear Opticians. The site uses genuine photos from the shop’s public feed, dated shop-post offers, links to the original sources, and verified Nairobi contact details. It does not invent unpublished specifications or represent dated social posts as live inventory.

## Development and checks

The project uses React 19, TypeScript, Vite 6, Express 5, MySQL and Motion. The package manager is pinned in `package.json`; reviewed lifecycle permissions are recorded in `pnpm-workspace.yaml`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The Express app and Vite middleware share the configured port 3000. `/_health` is an unauthenticated readiness endpoint. `public/manus-routes.json` declares the storefront, dynamic product path, private staff page, bag, inquiry and FAQ routes.

```sh
pnpm check
pnpm build
```

The build runs TypeScript checks, creates the Vite assets, pre-renders the public pages and `/staff`, and compiles the server to `server-dist/`. The staff page is pre-rendered with `noindex,follow`. Dynamic staff-created products are retrieved from the public API and receive route metadata in the client. Canonical and `og:url` tags remain omitted until the real public origin is finalized.

## Staff catalog

`/staff` uses Manus OAuth. Only email addresses in the protected server-side `SUNSENSOR_STAFF_EMAILS` project secret can manage listings; there is no public registration. Staff can create separate Frame or Lens entries, set each item's positive whole-KSh price, add a description, and attach multiple photos or videos. Phone camera and video-capture controls appear where supported, with file selection as a fallback. Drafts stay unpublished; publication requires a name, type, price and at least one successfully uploaded media file. Authorized staff can edit or unpublish staff-created items. The older source-backed shop offers remain separate and are not editable through this manager.

MySQL stores staff identities, sessions, catalog metadata and upload state in additive `sunsensor_*` tables. Media bytes use project-managed object storage and stable `/manus-storage/` URLs. The upload API authorizes staff and validates MIME type and size before requesting a signed upload address. Completion is not accepted on the browser's claim alone: the server requests a signed range download and verifies object presence, stored MIME type and total byte count before marking media ready. Browser code never receives the storage API credential. Development/Preview and the published app share the managed database, so avoid writing test listings or publishing test records into it.

Public visitors see only published staff listings that have a complete name and price and at least one ready media file. Each listing can be viewed and added to the existing bag; the existing WhatsApp inquiry includes its type and individual price. The original dated shop-post items remain in `src/data/products.ts` and stay independent of the live staff catalog.

## Production serving

`Dockerfile` installs dependencies, runs the complete pre-rendered build, and starts the compiled Express server. The server serves existing route-specific HTML from `dist/`, returns the generated 404 page for unknown paths, and mounts the staff and public APIs. The platform deployment declaration uses `/_health` for readiness. Static hashed Vite assets can be routed from the separate `dist/` output; server routes handle HTML and APIs.

A checkpoint push can trigger automatic publication while the Dashboard's `publishing.auto_publish` setting is enabled. Do not push a checkpoint for this project until the owner has turned that switch off if the change is not approved for public rollout.

## Project structure

- `src/pages/` contains the homepage, public catalog, static and staff-created product details, bag/inquiry, FAQs and staff editor.
- `src/components/` contains the shared storefront shell and product cards.
- `src/data/products.ts` is the source-backed set of existing dated offers; `src/data/catalogContext.tsx` and `src/data/staffCatalogApi.ts` handle the separately managed listings.
- `server/index.ts`, `server/auth.ts`, `server/catalog.ts` and `server/db.ts` implement HTTP serving, Manus OAuth and staff authorization, catalog/storage endpoints and additive MySQL schema initialization.
- `scripts/prerender.mjs` writes route-specific public HTML; `research/shop-facts.md` documents verified business/product claims and source URLs.

## Product image sources and shopping boundaries

The hero and general frame-range images are from SunSensor Eyewear’s public Facebook feed. The frame-video and photochromatic images link to their original shop posts. Product-image source links are distinct from the dated-price/specification source links. Generic feed photos are identified as illustrative rather than a verified model/SKU match. Product information and sources are documented in `research/shop-facts.md`.

The catalog is not a live feed of individual models or stock. Displayed prices on legacy listings come from dated public posts. The bag is stored in the visitor’s browser. Checkout prepares a WhatsApp message to the verified shop number; it does not take payment, reserve stock, guarantee a final price or claim an order was sent. The visitor reviews and sends the message in WhatsApp.

## Mobile experience

The white-and-blue storefront retains the SunSensor wordmark, yellow sun accent, genuine eyewear photos, dated prices, source links and verified contact details. The sticky mobile header provides bag, WhatsApp and hamburger controls. The product grid switches from one column on narrow phones to two columns on larger phones and tablet widths, then four columns on desktop. Images load lazily where appropriate; transitions respect reduced-motion preferences.

The public storefront was previously checked with Playwright across nine customer-facing pages at 320, 375, 390, 430, 768 and 1280px. The staff page and staff data mutation workflow require an authorized account for interactive confirmation. Because the managed database is shared with production, integration verification must not create or publish a test catalog item without explicit approval.
