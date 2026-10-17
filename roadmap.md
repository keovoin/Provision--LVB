# Roadmap

## Own-backend migration preparation
- [x] Prepare source handover, configuration template, migration inventory, and cutover/rollback guide
- [x] Inspect downloadable package for excluded secrets and generated/dependency files
- [ ] Restore and verify destination — blocked until user supplies their own project and official database/storage exports

## Quote and custom requests
- [x] Full request QA: 29 automated tests; signed-in account isolation, prohibited offers/status writes, rate limits, image validation, informational replies, replaced offers, accept/decline, desktop/mobile layout; temporary rows/photos removed
- [x] Private request storage, conversation replies, and offer decisions
- [x] Customer forms, examples, multi-image uploads, and request history
- [x] Staff inbox and Requests permission in the role matrix
- [x] Automated transition tests and signed-in submission, staff offer, accept/decline verification

## Done: Warehouse POS & inventory
- [x] DB: stock_movements + record_stock_movement; suppliers, purchase_orders(+items), pos_sales(+items), receive_purchase_order, pos_checkout
- [x] Stock scan page (/admin/stock): SKU scan/type, IN/OUT, qty, note, history — tested end-to-end
- [x] Staff permission sections "stock" + "pos" (staff page, create-staff fn, AdminShell NEED)
- [x] Camera barcode scanning (html5-qrcode) on stock + POS pages — needs real-device test (no camera in test browser)
- [x] Suppliers page + purchase orders with one-tap receive (adds stock, logs movements)
- [x] POS (/admin/pos): walk-in sale, cash/KHQR, instant paid, printable receipt — tested end-to-end, test data cleaned up

## Test accounts for client demo
- [x] Create test users: sales, inventory, admin, delivery staff + customer (Sokha Mart)
- [x] Give user copy-paste credentials list
## Per-customer credit terms
- [x] Migration 0027: profiles.credit_terms_days, place_order/staff_create_order use per-customer terms
- [x] Cart + order page: show net option only when terms set, dynamic "Net X days" label
- [x] Admin customers page: edit terms days per customer
- [x] Update static "Net 30" labels to generic credit label
