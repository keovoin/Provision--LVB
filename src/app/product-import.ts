export const IMPORT_COLUMNS = [
  "SKU", "Name KH", "Name EN", "Unit EN", "Unit KH", "Category", "Description KH", "Description EN",
  "Cost USD", "Stock", "Reorder level", "Price tiers", "Active",
] as const;

export interface ImportCategory { id: string; slug: string; name_en: string; name_km: string }
export interface ImportTier { qty_min: number; qty_max: number | null; price_usd: number }
export interface ImportItem {
  row: number; sku: string; name_km: string; name_en: string; unit: string; unit_km: string;
  category: string; category_id: string | null; description_km: string; description_en: string;
  cost_usd: number; stock_qty: number; reorder_threshold: number; tiers: ImportTier[]; active: boolean;
}
export interface ImportResult { items: ImportItem[]; errors: string[]; newCategories: string[] }

const str = (v: unknown) => (v == null ? "" : v instanceof Date ? "\u0000date" : String(v)).trim();
const num = (v: unknown) => { const s = str(v).replace(/[$,]/g, ""); return s === "" ? NaN : Number(s); };

/** "1:2.50; 10:2.20; 50:2.00" → ordered tiers with qty_max filled from the next tier. */
export function parseTiers(text: string): ImportTier[] | string {
  if (text.includes("\u0000date")) return "Excel changed this into a time/date — set the Price tiers column to Text";
  const parts = text.split(/[;\n|]+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return "missing price tiers";
  const raw: { qty_min: number; price_usd: number }[] = [];
  for (const p of parts) {
    const m = /^(\d+)\s*[:=]\s*\$?\s*(\d+(?:\.\d+)?)$/.exec(p);
    if (!m) return `bad tier "${p}" (use qty:price)`;
    raw.push({ qty_min: Number(m[1]), price_usd: Number(m[2]) });
  }
  raw.sort((a, b) => a.qty_min - b.qty_min);
  if (raw[0].qty_min !== 1) return "first tier must start at quantity 1";
  for (let i = 1; i < raw.length; i++) if (raw[i].qty_min === raw[i - 1].qty_min) return `duplicate tier quantity ${raw[i].qty_min}`;
  if (raw.some((t) => t.price_usd <= 0)) return "prices must be above 0";
  return raw.map((t, i) => ({ ...t, qty_max: i < raw.length - 1 ? raw[i + 1].qty_min - 1 : null }));
}

export function matchCategory(name: string, cats: ImportCategory[]) {
  const n = name.trim().toLowerCase();
  return cats.find((c) => [c.slug, c.name_en, c.name_km].some((x) => x.trim().toLowerCase() === n)) ?? null;
}

/** rows[0] is the header row; columns are matched by header name, so order does not matter. */
export function parseProductRows(rows: unknown[][], cats: ImportCategory[]): ImportResult {
  const errors: string[] = [];
  const items: ImportItem[] = [];
  const newCategories = new Set<string>();
  if (!rows.length) return { items, errors: ["The file is empty"], newCategories: [] };
  const header = rows[0].map((h) => str(h).toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const missing = ["SKU", "Name KH", "Name EN", "Price tiers"].filter((c) => col(c) < 0);
  if (missing.length) return { items, errors: [`Missing column(s): ${missing.join(", ")}`], newCategories: [] };
  const get = (r: unknown[], name: string) => { const i = col(name); return i < 0 ? "" : r[i]; };
  const seen = new Set<string>();
  rows.slice(1).forEach((r, idx) => {
    const row = idx + 2;
    if (r.every((v) => str(v) === "")) return;
    const sku = str(get(r, "SKU"));
    if (sku.includes("\u0000date")) { errors.push(`Row ${row}: Excel changed the SKU into a date — set the SKU column to Text`); return; }
    const bad = (msg: string) => errors.push(`Row ${row}${sku ? ` (${sku})` : ""}: ${msg}`);
    if (!sku) return bad("SKU is required");
    if (seen.has(sku.toLowerCase())) return bad("duplicate SKU in file");
    seen.add(sku.toLowerCase());
    const name_km = str(get(r, "Name KH")), name_en = str(get(r, "Name EN"));
    if (!name_km || !name_en) return bad("Name KH and Name EN are required");
    const tiers = parseTiers(str(get(r, "Price tiers")));
    if (typeof tiers === "string") return bad(tiers);
    const cost = num(get(r, "Cost USD")), stock = num(get(r, "Stock")), reorder = num(get(r, "Reorder level"));
    if ((!Number.isNaN(cost) && cost < 0) || (!Number.isNaN(stock) && stock < 0) || (!Number.isNaN(reorder) && reorder < 0)) return bad("cost, stock and reorder level can't be negative");
    const category = str(get(r, "Category"));
    const match = category ? matchCategory(category, cats) : null;
    if (category && !match) newCategories.add(category);
    const activeText = str(get(r, "Active")).toLowerCase();
    items.push({
      row, sku, name_km, name_en,
      unit: str(get(r, "Unit EN")) || "pcs", unit_km: str(get(r, "Unit KH")) || "ដុំ",
      category, category_id: match?.id ?? null,
      description_km: str(get(r, "Description KH")), description_en: str(get(r, "Description EN")),
      cost_usd: Number.isNaN(cost) ? 0 : cost,
      stock_qty: Number.isNaN(stock) ? 0 : Math.floor(stock),
      reorder_threshold: Number.isNaN(reorder) ? 10 : Math.floor(reorder),
      tiers, active: !["no", "n", "false", "0", "ទេ"].includes(activeText),
    });
  });
  return { items, errors, newCategories: [...newCategories] };
}

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `cat-${Date.now().toString(36)}`;
