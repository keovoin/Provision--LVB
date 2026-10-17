# Warehouse stock scanning (inventory in/out)

## Goal

Let warehouse staff record stock movements fast — scan or type a product SKU, choose IN (receiving new inventory) or OUT (damage, loss, manual removal), enter quantity, done. Every movement is logged with who/when/why, and product stock updates instantly.

Note: customer orders already deduct stock automatically — this is for everything that happens *outside* orders (receiving goods from suppliers, damaged items, corrections).

## What you get

1. **New admin page: Stock scan** (`/admin/stock`)
   - One big scan box, always focused — works with any USB/Bluetooth barcode scanner (it types the SKU + Enter) and with manual typing.
   - Scan/type SKU or product name → product appears with photo, current stock, unit.
   - Choose **IN** or **OUT**, enter quantity, optional note (e.g. "supplier delivery", "damaged").
   - Confirm → stock updates immediately, row added to today's movement list on screen.
   - Rapid mode: after each scan the box clears and refocuses, so staff can scan many items in a row.
   - Khmer/English labels, large touch-friendly controls (works on a phone or tablet at the warehouse).

2. **Movement history**
   - Recent movements list on the same page (product, in/out, qty, note, staff member, time).
   - Included in the existing Excel sales/stock reporting later if wanted.

3. **Permission**
   - New staff permission section **"ស្តុក (Stock)"** in Admin → Staff, so you can give warehouse staff stock access without giving them Products editing or prices.
   - Owner always has access.

4. **Safety**
   - OUT cannot make stock go below zero (clear error message).
   - Every movement is stored permanently — you can always see who changed stock and why.
   - Stock alerts (existing low-stock warning) keep working, since movements update the same stock number.

## Technical details

- New table `public.stock_movements` (id, product_id, kind in/out, qty, note, created_by, created_at) with RLS: staff with stock/orders permission or owner can read; inserts only via a security-definer function.
- New DB function `record_stock_movement(_product_id, _kind, _qty, _note)` — checks caller permission, validates qty > 0 and sufficient stock for OUT, updates `products.stock_qty` and inserts the movement row in one transaction.
- New route `src/routes/_authenticated/admin/stock.tsx`; added to AdminShell nav and `NEED` map; new `stock` section added to the staff permission lists (staff page + staff creation function).
- No barcode hardware required — scanners act as keyboards; phone camera scanning can be added later if wanted.

## Not included (say the word to add)

- Camera-based scanning via phone.
- Supplier management / purchase orders.
- Counter-sales POS (walk-in sales) — that was the earlier idea, available separately.
