# ProvisionKH

**Wholesale grocery ordering, built for Cambodia.**

ProvisionKH is a complete commerce platform that connects wholesale suppliers with shops and restaurants across Cambodia. Customers browse a Khmer-first mobile storefront, order in a few taps, and pay by KHQR — while your team runs the entire operation from one admin portal.

## What you get

### Customer storefront (mobile-first, Khmer & English)
- Browse catalog by category with search, favourites, quick view, and product recommendations
- Quantity-tier wholesale pricing with clear savings labels
- Cart, checkout, KHQR payment with automatic confirmation, and live order tracking
- Scheduled delivery drops, promotions, and rich product pages (photo galleries, video, reviews)
- Works as a website, an Android/iOS app (Play Store ready), and a Telegram Mini App

### Operations portal (desktop-optimized)
- **Orders** — create, confirm, fulfill, and track every order; printable receipts and invoices
- **POS** — walk-in counter sales with barcode scanning, cash or KHQR, instant receipts
- **Inventory** — scan stock in/out, low-stock warnings, full movement history
- **Purchasing** — suppliers and purchase orders with one-tap receiving
- **Catalog** — products, categories, banners, promotions, wholesale price tiers, bulk Excel import
- **Finance** — receivables tracking, delivery fee rules, sales reports with Excel export
- **Team** — staff accounts with per-section permissions, owner-only controls
- **Safety** — daily automatic database backups with one-tap download, Telegram order alerts

### Built for Cambodia
- Khmer-first interface with full English support
- KHQR payments (Bakong-compatible), USD pricing with KHR exchange rate
- Telegram bot integration for customer ordering and owner alerts

## Technology

React 19 · TanStack Start · Tailwind CSS v4 · Capacitor (iOS/Android) · Lovable Cloud (database, auth, storage)

## Development

```bash
bun install --frozen-lockfile
bun run dev
```

## License

Proprietary. All rights reserved.

## Backend ownership handover

See [the migration guide](docs/migration/README.md) for exports, private storage, configuration, independent hosting and cutover checks. Preparation only: the current Cloud app remains unchanged. Database/user exports and service secrets are not included in the repository.
