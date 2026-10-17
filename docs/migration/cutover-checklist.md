# Destination acceptance checklist

Record tester/date/results privately. No passwords/tokens in evidence. Verify using actual signed-in destination accounts, not source inspection or the guest catalog alone.

## Transfer
- [ ] User-owned destination and separate staging hosting confirmed.
- [ ] Official database/auth export secured; storage downloaded separately.
- [ ] Export format and supported restore process reviewed by destination admin.
- [ ] Auth/email/provider settings recorded privately and reconfigured.
- [ ] Staging alerts off; separate test bot/provider sandbox where available.
- [ ] Schema, constraints, sequences, triggers, functions, grants and RLS verified.
- [ ] Row counts match for profiles, roles/permissions, catalog/prices/media, orders/items/payments, requests/messages/images, stock, purchasing, POS and settings.
- [ ] Auth UUIDs/passwords and linked records preserved; existing user logs in.
- [ ] Private bucket settings/policies, object paths and counts/sizes verified.
- [ ] Extensions and exactly one intended active daily job verified.
- [ ] Destination full database and storage backup plan verified.

## App acceptance
- [ ] Signup/confirmation, email/password login, logout/reset and Google login work.
- [ ] Customer cannot read another customer's orders, requests or attachments.
- [ ] Owner/sales/inventory/admin/delivery permissions match; unauthorized direct writes fail.
- [ ] Catalog, banner, product/video/review/description photos render.
- [ ] Quantity tiers, delivery fee and totals match previous behavior.
- [ ] Credit option only for configured customers; limits and their own term days honored.
- [ ] Customer request with images → staff offer → customer accept/decline reads back.
- [ ] Cash order and KHQR payment settle once; duplicates are safe; invalid signatures rejected.
- [ ] Pending payments preserved without new charges or duplicate orders.
- [ ] POS, stock IN/OUT and purchase-order receiving update inventory once and read back.
- [ ] Reports/Excel, receivables and receipts verified.
- [ ] Telegram menu/webhook/initData/order message and owner alerts verified.
- [ ] AI independently configured/tested or explicitly left unavailable.
- [ ] Mobile hosted server calls, auth/payment returns and camera scanning tested on real devices.

## Production
- [ ] Maintenance window and rollback/reconciliation owner agreed.
- [ ] Writes paused; in-flight payments/callbacks coordinated.
- [ ] Final fresh export and final media transferred with no lost interim writes.
- [ ] Browser build and server settings point to same destination; server and assets deployed.
- [ ] Domain/auth redirects, payment callback and Telegram switched deliberately.
- [ ] New live order/payment/request/stock flows exercised and read back.
- [ ] Errors and reconciliations checked; old system kept intact and non-writable.
- [ ] Any rollback after new writes reconciles destination changes first.

Never delete/disconnect the old Cloud database as a shortcut: deletion is irreversible.
