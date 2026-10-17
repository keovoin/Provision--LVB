# Project Architecture Rules

- Keep quote/custom requests and offer transitions in authenticated database functions with row locks and a dedicated Requests permission; private attachment paths and user-scoped queries prevent cross-customer access and stale offer decisions.

- Keep quantity-tier selection and savings calculations in the pure tier helpers, with product UI selecting tiers by quantity boundaries rather than matching prices; this keeps highlighting correct for equal-priced tiers and makes pricing behavior testable.

- Keep consumer-facing design-system source self-contained under `src/design-system/provisionkh`; file-copy attachment must not depend on preview-only modules.
- Export the complete public API through `src/index.ts`; publishing discovers local components from that barrel.
- Keep the permanent showcase in route and `src/showcase` files excluded by `.dsignore`; consumers receive the system, not its documentation shell.
- Treat `src/design-system/provisionkh/theme.css` as the canonical attachable theme entry; consumers should need one theme import.
- Keep commerce application screens under authenticated TanStack route layouts; the shared system remains attach-safe and app state stays outside it.
- Package the mobile storefront with Capacitor while keeping the TanStack web app as the single source of truth for iOS, Android, and web.
- Keep `/` as an app entry that redirects to the authenticated storefront; the design-system showcase must never be the public home experience.
- Adapt Watermelon UI's source-backed navigation and dashboard patterns through existing ProvisionKH controls and theme tokens rather than replacing commerce screens with demo templates; this preserves routing, localization, and live workflows.
- Keep storefront catalog, product, banner, and order reads in user-scoped TanStack Query options, primed by route loaders for critical reads; caching and deduplicated visible-tab polling prevent request loops and repeated photo loading without weakening authorization.
- KHQR payments support two sources behind one flow: the existing hosted provider (default) and an own-QR mode (`src/lib/khqr.ts` + `bakong.server.ts`, enabled only when `PAYMENT_QR_SOURCE=bakong` and Bakong secrets exist), marked by a `bakong:` prefix on `provider_payment_id`; this keeps the hosted provider as a working fallback.
- Store product and review media as ordered database records pointing to private storage paths, while keeping `products.photo_url` as the backward-compatible primary image; this supports galleries without breaking existing catalog cards.
- Owner Telegram alerts are sent by database triggers through pg_net using the owner-only `alert_settings` row; this covers every order path and keeps the bot token out of storefront-readable settings.
- Storefront-visible settings (footer text, links, exchange rate, delivery rule) are read through the `get_storefront_info()` function, because `app_settings` itself is staff-only.
- Delivery fees are added by a BEFORE INSERT trigger on customer self-checkout orders, so the cart only previews and the database stays the source of truth for totals.
- Daily backups are JSON snapshots in the owner-only `db_backups` table created by pg_cron (last 14 kept); downloads happen from the admin Backups page.
- Keep own-backend migration handover under `docs/migration` and destination rewiring in a separate deployment branch; official database exports plus separately transferred private storage preserve identity without disrupting the managed app.
