# ProvisionKH — own-backend migration handover

Prepared 17 October 2026. **Preparation only: the running app is unchanged.**

## Contents and boundaries

Source code, Android/iOS shells, SQL history 0000–0027, a blank configuration template and acceptance checklist. **No database records, auth exports, storage media or private keys are included.**

Lovable Cloud already provides the underlying database/auth/storage technology without extra setup. Keeping it is the lowest-disruption option. For user-owned Supabase, restore into a separate project and configure an independent application deployment; this handover does not replace the managed Cloud connection in place.

Supabase supplies database, auth and storage, **not the whole application server**. Existing TanStack Start server functions and public webhook handlers need hosting too. The current build targets Cloudflare Workers. No Supabase Edge Functions exist in this source tree; converting the server is not necessary for a data move.

## 1. Export real data and files

In Lovable: **More → Database → Manage → Settings → Export project data → Export data → Database → Export → Start export**. Download from the emailed link or More → Storage. The official export includes database structure, records and auth accounts with password hashes. Keep it private/encrypted: it may also include credentials in application tables, such as owner Telegram alert settings.

Limits: database up to 15 GB, export file up to 5 GB, one export per 24 hours; backend must be running. This project currently shares one Cloud instance between preview and live.

Download media separately from **More → Storage**. Neither daily backups nor the official database export include storage files. Preserve bucket names, object paths, user UUIDs and all record relationships. Do not put exports or customer files in GitHub.

**Admin → Backups JSON is not a migration backup:** it omits auth accounts, schema, files and newer request/POS/stock/purchasing tables. Use the official export instead.

## 2. Restore an isolated destination

The destination administrator must inspect the official export format and follow its included instructions and the destination-supported restore procedure. Do not assume it is a plain SQL file or blindly paste it into an editor. Restore to an empty staging destination first, preserving auth UUIDs/password hashes, profile links, roles, permissions, grants, policies, functions and triggers. Verify extensions and scheduler state separately; do not overwrite managed schemas.

**Do not replay migrations 0000–0027 on a complete restored export.** These historical files are not uniformly idempotent and can collide with tables/policies/triggers, rerun seed changes or reschedule jobs. An empty new-install path requires separate developer review and bucket/dependency provisioning and does not preserve existing users/data.

### Verified current storage configuration

| Bucket | Public | Limit | Bucket MIME allowlist |
| --- | --- | --- | --- |
| `product-photos` | No | 15,728,640 bytes (15 MiB) | None configured |
| `request-images` | No | 5,242,880 bytes (5 MiB) | None configured |

Restore private storage policies too. Match file counts/sizes and checksums where available. Test signed URLs, catalog/video/review media and customer attachments. Never make buckets public to bypass policy errors.

### Extensions and scheduled work

Live extension names verified: `pg_cron`, `pg_net`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`. Configure destination-supported equivalents. `pg_net` sends owner Telegram alerts.

Migration 0022 declares `daily-db-backup`, schedule `0 20 * * *`, calling `public.create_db_backup()` at 20:00 UTC / 03:00 Phnom Penh next day. Its function keeps the newest **14** selected-table JSON snapshots. The available tool could not inspect current scheduler state: verify exactly one intended active destination job; do not assume scheduler configuration transfers. Configure full database and file backups independently.

## 3. Independent app configuration

Use `destination.env.example` as a blank checklist. Browser public settings belong at build time; private settings belong in the destination hosting secret store, never in `VITE_*`. Obtain fresh destination keys there. The current Cloud privileged key/database password are not available for export.

Browser and server must point at the **same destination**. Existing clients read the listed names, but old `VITE_*` build values take precedence over server fallbacks. Rebuild when changing browser values. Do not edit generated clients or the managed live `.env` to force a rebind. In the external repository, ignore actual `.env*` and `.dev.vars` files before adding any credentials; only blank examples belong in version control.

On a separate external branch: install with `bun install --frozen-lockfile`, supply destination configuration and run `bun run build`. Deploy the generated Worker and assets together using the matching Cloudflare Vite/Wrangler workflow; inspect the generated deployment config and output paths, not just `dist/client`. Add server secrets in hosting. Keep `nodejs_compat` and bundled dependencies; do not introduce SSR externals. Do not run Drizzle migrations against a restored database without reviewing its ledger.

Editor-only `mockupPreviewPlugin.ts` depends on `.lovable` metadata. For independent production, remove that plugin import/registration and the `[__component]`/`[__mockup]` preview route sources together in the external branch, letting TanStack regenerate the route tree. Private editor metadata and generated output are excluded from the handover.

## 4. Services that need destination setup

- **Email/password:** configure site URL, redirects, email delivery, confirmation and reset settings; settings are not exported. Verify existing passwords and new signup. Existing sessions must sign in again.
- **Google:** `src/routes/auth.tsx` uses Lovable OAuth through `src/integrations/lovable/index.ts`. Independent hosting needs destination Google configuration and a destination-native sign-in flow on the external branch. Return to a same-origin public callback, then navigate after session hydration. Changing database keys alone does not migrate Google login.
- **Hosted KHQR:** reconfigure `PAYMENT_API_KEY` and `PAYMENT_WEBHOOK_SECRET`; register `/api/public/payment-webhook` on the new host. Preserve provider-payment IDs, verify signatures and idempotent settlement. Do not regenerate pending payments or charge twice.
- **Optional own Bakong QR:** keep hosted mode default; activate only with `PAYMENT_QR_SOURCE=bakong` and verified Bakong credentials. Relay requires both relay settings. Recheck token expiry/network access; old credentials may no longer be usable.
- **Telegram Mini App:** `src/lib/telegram.server.ts` pins app origin and bot identity and uses a Lovable connector gateway. Update origin/identity and replace or explicitly validate gateway access on the external branch. The connector key is not a raw bot token. Configure domain/menu/webhook and preserve initData plus webhook-secret verification. Use a separate staging bot to avoid hijacking live delivery.
- **Owner Telegram alerts:** restored `alert_settings` can contain credentials. Keep alerts off on staging; verify `pg_net`, test and enable deliberately.
- **AI tools:** `src/lib/ai-gateway.server.ts` uses Lovable gateway credentials/model. These do not transfer with database exports. Configure an independent provider or verify authorized gateway access before claiming the tools work.
- **SMS:** optional code needs PlasGate credentials and `OTP_PEPPER`; phone login currently says coming soon and must not be advertised as working.
- **Android/iOS:** verify hosted server origin/calls, auth callbacks, app links, payments and real-device scanning. A static Capacitor bundle alone cannot serve TanStack functions.

When changing domain, review Telegram links, public sitemap/robots and route metadata. Never weaken RLS or grant everyone admin access to get the destination working.

## 5. Cutover and rollback

Complete `cutover-checklist.md` on staging first. Agree a maintenance window; pause orders, staff writes, stock updates and payment creation, and coordinate pending callbacks. Export final database state and copy final media. Keep **one writable production system**. If export limits prevent a fresh final export, delay cutover instead of losing interim changes.

Keep old hosting/backend intact until acceptance. After new destination writes occur, rollback requires pausing and reconciling new orders/payments/stock first; simply pointing back at the old database loses those writes. Do not remove the old Cloud database as a shortcut: deletion is irreversible and can permanently remove data, storage and functions.

**Still needed:** user's destination project, official private export, separate media, independent hosting, auth settings and service secrets. No destination restore, rewiring, deploy or destination end-to-end verification has occurred.
