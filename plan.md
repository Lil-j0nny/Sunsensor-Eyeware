# SunSensor Staff Additions — Implementation Plan

## Product scope and behavior

Keep the current SunSensor storefront, four existing shop-post listings, their photographs, source links, displayed prices, contact details, cart and WhatsApp inquiry behavior unchanged. Add a separate staff-only way to create **new** catalog listings; do not edit, migrate, seed over, or delete existing listings.

An authorized staff member can create a new item of type **Frame** or **Lens**, enter its name and description, set one KSh price for that item, and attach multiple photos and/or videos. On a phone, staff can use the camera/video capture option where the browser supports it, or choose existing media. They can save an incomplete listing as a draft, preview it, and explicitly publish it. A new item cannot be published until its name, type, price, and at least one media file are present. Staff can later edit or unpublish only staff-created items. Existing social-post listings remain as they are.

Published new items appear alongside the current offerings in the public catalog and a small “New in the shop” area; public visitors can view the media and price and add a listing to the existing bag/WhatsApp inquiry flow. Each listing carries its own price, so different lenses or frame models can be entered as separate items. The inquiry contains the item type and displayed price. No live stock or payment processing is added.

## Implementation approach and project structure

Keep the existing React 19, TypeScript, Vite and Motion frontend. Add an Express API and managed MySQL for staff accounts, new catalog listings and media metadata; use Manus project object storage for media bytes. In development, Express mounts Vite middleware on the existing port 3000 so the current public site and APIs run together in Preview. In production, the Dockerfile builds the Vite assets, pre-renders route-specific HTML, compiles the server, and starts Express; hashed static assets use the build output while page HTML and APIs use the server.

- `src/pages/StaffCatalogPage.tsx` — private mobile-first listing manager with draft/publish actions, separate Frame/Lens item types, KSh price entry, camera/file inputs and previews.
- `src/data/staffCatalogApi.ts` and `src/types/catalog.ts` — typed public/admin API models and client helpers; preserve the existing `src/data/products.ts` values and source links.
- Existing `src/pages/`, `src/components/` and cart utilities — keep the current public experience, append published staff-created items to the catalog, and support those items in the existing bag and inquiry message.
- `server/index.ts` — Express entry and Vite development middleware, public read-only published-catalog endpoint, protected staff APIs, and production route-specific HTML/health serving.
- `server/auth.ts` — Manus OAuth, one-use state/nonce checking, session creation, proxy-aware public-origin validation for Preview, and server-side allowlist/role and CSRF checks.
- `server/catalog.ts` — parameterized MySQL operations for staff-created items, media uploads, and draft/published state.
- `server/db.ts` — additive idempotent schema initialization for staff identities/sessions, staff-created items and photos/videos; no backfill or writes to the current four static listings.
- `Dockerfile` — reproducible production image build and server entrypoint; `scripts/prerender.mjs` writes the known public routes and the private `/staff` sign-in page with `noindex` metadata.
- Package/lock/workspace files, Vite/server configuration and `public/manus-routes.json` — reproducible build, route declarations including `/staff`, and hybrid serving.

The server uses the platform `DATABASE_URL` for durable MySQL data and the server-only `MANUS_API_URL`/`MANUS_API_KEY` for presigned storage uploads. Browser code receives only a one-file upload URL after server authorization, never the platform credential. Store generated, non-colliding object keys and stable `/manus-storage/<key>` paths with each item's media metadata. Restrict accepted image/video types and sizes; before marking media ready, verify through a signed ranged GET that the object exists and its stored MIME type and total byte count match the reservation. Render video with user-controlled playback and metadata-only preload. Use additive, idempotent migrations and never seed or overwrite the existing static catalog.

Because no login provider was specified, use the platform's default Manus OAuth. The protected `SUNSENSOR_STAFF_EMAILS` project secret allowlists the shop's Manus-account email addresses; its value must never be exposed in source or logs. There is no public registration. Each staff member therefore needs a Manus account. Set the application session cookie to `webdev_app_session` with `HttpOnly`, `SameSite=None; Secure` for public HTTPS Preview and production; bind OAuth state to a short-lived, single-use nonce, validate app ID and expiry for Preview-issued project sessions, validate the proxied public origin, and enforce authorization and CSRF checks on every write/upload/publish request.

The project has one-way `features.server: true` and managed MySQL enabled; the database is shared by Cloud Preview/development and the published app, so staff test records would be live records. Keep the `dist` build, add a container with `/_health` readiness, route `/api/*` to the server, serve hashed `/assets/*` from static output, and route page HTML through the server so pre-rendered pages and 404 status are preserved. The user's approved scope excludes a public rollout. The project config has `publishing.auto_publish: true`, so do not push a checkpoint to canonical `main` until the user turns auto-publish off in the Project Dashboard; otherwise leave the work in Preview and do not publish it.

## Design decisions

**Design Movement:** A practical optical-workshop tool integrated into the site's editorial blue-and-white storefront, never a detached generic dashboard.

**Core Principles:** Keep existing public content untouched; make phone capture and pricing quick; give each new frame/lens a clear individual price; let staff control when a draft becomes public.

**Color Philosophy:** Use the established white/deep-blue surfaces for clarity and trust, pale blue to group form sections, and the existing yellow sun accent only for small highlights.

**Layout Paradigm:** On phones, a single stacked editor with clear Details, Media and Price sections and a bottom save/publish action. On larger screens, a compact listing rail sits beside a roomy editor; avoid dense tables.

**Signature Elements:** Retain the SunSensor sun-and-frame mark; use Frame/Lens category chips; keep the KSh price prominent beside the item's real media.

**Interaction Philosophy:** Camera access begins only after a staff tap and browser permission; file selection is always available. Media is previewed before save; draft and publish are separate, explicit actions with status feedback.

**Animation:** Short 160–220ms transitions for drawer, preview and save-state changes. No parallax, looping dashboard animation or autoplay video. Respect `prefers-reduced-motion` and show upload progress instead of decorative movement.

**Typography System:** Reuse the existing Manrope headings with DM Sans interface/body text. Use clear KSh numerals, concise labels and at least 16px form text on phones.

**Brand Essence:** Modern eyewear for Nairobi customers, with new styles and lens listings maintained directly by the local SunSensor shop — **clear, welcoming, considered**.

**Brand Voice:** Direct, practical and warm. Examples: “Add a new frame” and “Set the price before publishing.”

**Wordmark & Logo:** Preserve the existing custom SunSensor wordmark and yellow sun/frame mark; do not introduce a new staff brand.

**Signature Brand Color:** SunSensor deep blue `#123f6c`, balanced with white and supported by the existing `#f0d45b` sun accent.

## Material constraints and owner choices

Enabling managed server and database capabilities is one-way and cannot later be disabled for this project. Cloud Preview/development and the published app share the same database. The additive migration will create new tables only; it will not write to or change the four current source-backed listings. No customer-facing deployment is included.

Manus OAuth is the default under the platform login guidance. Authorized shop staff therefore need Manus accounts, and their email addresses must be supplied through the protected input card. If SunSensor staff do not use Manus accounts, pause and revise the plan around a provider the user selects. New-item prices are staff-entered values; no unverified prices or product claims will be inferred.
