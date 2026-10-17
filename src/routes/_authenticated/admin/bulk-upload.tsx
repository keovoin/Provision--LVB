import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button, Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { PageHead, toast, usd } from "@/app/admin-ui";
import { IMPORT_COLUMNS, parseProductRows, slugify, type ImportCategory, type ImportResult } from "@/app/product-import";

export const Route = createFileRoute("/_authenticated/admin/bulk-upload")({
  head: () => ({ meta: [{ title: "នាំចូលទំនិញ | ProvisionKH Ops" }, { name: "description", content: "Bulk upload ProvisionKH products from Excel." }, { property: "og:title", content: "ProvisionKH Bulk Product Upload" }, { property: "og:description", content: "Upload many products at once from Excel." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ImportPage,
});

function ImportPage() {
  const [cats, setCats] = useState<ImportCategory[]>([]);
  const [existing, setExisting] = useState<Map<string, string>>(new Map());
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; updated: number; failed: string[] } | null>(null);

  const load = () => {
    void supabase.from("categories").select("id,slug,name_en,name_km").order("sort_order").then(({ data }) => setCats((data ?? []) as ImportCategory[]));
    void supabase.from("products").select("sku").then(({ data }) => setExisting(new Map((data ?? []).map((p) => [p.sku.toLowerCase(), p.sku]))));
  };
  useEffect(load, []);

  async function template() {
    const { default: writeExcelFile } = await import("write-excel-file/browser");
    const head = IMPORT_COLUMNS.map((value) => ({ value, fontWeight: "bold" as const }));
    const cat = cats[0]?.name_km ?? "ភេសជ្ជៈ";
    const sample = [
      ["DRK-001", "ទឹកសុទ្ធ 500ml x 24", "Drinking water 500ml x 24", "case", "កេស", cat, "ទឹកសុទ្ធស្អាត សម្រាប់ហាង", "Clean bottled water for shops", 3.2, 120, 20, "1:4.50; 10:4.20; 50:3.90", "yes"],
      ["RCE-025", "អង្ករផ្កាម្លិះ 25kg", "Jasmine rice 25kg", "bag", "បាវ", cat, "អង្ករក្រអូប", "Fragrant jasmine rice", 18, 40, 5, "1:24; 5:23; 20:22", "yes"],
    ].map((r) => r.map((value) => (typeof value === "number" ? { value, type: Number } : { value: String(value), type: String })));
    const guide = [[{ value: "Column", fontWeight: "bold" as const }, { value: "How to fill", fontWeight: "bold" as const }], ...([
      ["SKU", "Required. Unique code. An existing SKU updates that product."],
      ["Name KH / Name EN", "Required."],
      ["Unit EN / Unit KH", "e.g. case / កេស. Default pcs / ដុំ."],
      ["Category", "Khmer or English name, or slug. New names are created for you."],
      ["Description KH / EN", "Optional product description."],
      ["Cost USD, Stock, Reorder level", "Numbers. Reorder level default 10."],
      ["Price tiers", "Required. qty:price separated by ; — must start at 1. e.g. 1:4.50; 10:4.20"],
      ["Active", "yes / no. Default yes."],
    ]).map(([a, b]) => [{ value: a }, { value: b }]), [{ value: "" }, { value: "" }], [{ value: "Existing categories", fontWeight: "bold" as const }, { value: "" }], ...cats.map((c) => [{ value: c.name_km }, { value: `${c.name_en} (${c.slug})` }])];
    await writeExcelFile([
      { data: [head, ...sample], sheet: "Products", stickyRowsCount: 1, columns: IMPORT_COLUMNS.map((c) => ({ width: c.startsWith("Desc") || c.startsWith("Name") ? 30 : c === "Price tiers" ? 28 : 12 })) },
      { data: guide, sheet: "Guide", columns: [{ width: 30 }, { width: 70 }] },
    ] as never).toFile("provisionkh-products-template.xlsx");
  }

  async function pick(file: File) {
    setDone(null); setFileName(file.name);
    try {
      let rows: unknown[][];
      if (/\.csv$/i.test(file.name)) {
        const text = await file.text();
        rows = text.split(/\r?\n/).map((line) => (line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'))).filter((r) => r.some((c) => c.trim()));
      } else {
        const { readSheet } = await import("read-excel-file/browser");
        rows = (await readSheet(file)) as unknown[][];
      }
      setResult(parseProductRows(rows, cats));
    } catch (e) { toast.error("មិនអាចអានឯកសារ · Can't read file: " + (e as Error).message); }
  }

  useEffect(() => { if (!progress) return; const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [progress]);

  async function run() {
    if (!result?.items.length) return;
    if (!window.confirm(`នាំចូល ${result.items.length} ទំនិញ? · Import ${result.items.length} products?`)) return;
    const failed: string[] = []; let created = 0, updated = 0;
    const catIds = new Map<string, string>();
    for (const [i, name] of result.newCategories.entries()) {
      setProgress(`ក្រុមទំនិញ · Category ${name}`);
      const { data, error } = await supabase.rpc("admin_upsert_category", { _id: null as never, _slug: slugify(name), _name_en: name, _name_km: name, _icon: "📦", _sort_order: 100 + i, _active: true });
      if (error) failed.push(`Category "${name}": ${error.message}`); else catIds.set(name, data as string);
    }
    for (const [n, it] of result.items.entries()) {
      setProgress(`${n + 1} / ${result.items.length} · ${it.sku}`);
      const description = it.description_km || it.description_en ? [{ type: "text", km: it.description_km, en: it.description_en }] : [];
      const isNew = !existing.has(it.sku.toLowerCase());
      const { data: p, error } = await supabase.from("products").upsert({
        sku: existing.get(it.sku.toLowerCase()) ?? it.sku, name_km: it.name_km, name_en: it.name_en, unit: it.unit, unit_km: it.unit_km,
        category_id: it.category_id ?? catIds.get(it.category) ?? null, cost_usd: it.cost_usd, stock_qty: it.stock_qty,
        reorder_threshold: it.reorder_threshold, active: it.active, ...(description.length || isNew ? { description } : {}), updated_at: new Date().toISOString(),
      }, { onConflict: "sku" }).select("id").single();
      if (error || !p) { failed.push(`Row ${it.row} (${it.sku}): ${error?.message}`); continue; }
      const del = await supabase.from("product_prices").delete().eq("product_id", p.id);
      const ins = del.error ? del : await supabase.from("product_prices").insert(it.tiers.map((t) => ({ ...t, product_id: p.id })));
      if (ins.error) { failed.push(`Row ${it.row} (${it.sku}) prices: ${ins.error.message}`); continue; }
      if (isNew) created++; else updated++;
    }
    setProgress(null); setDone({ created, updated, failed }); setResult(null); load();
    if (!failed.length) toast.success(`បានបង្កើត ${created} · កែ ${updated}`);
  }

  return <>
    <PageHead title="នាំចូលទំនិញច្រើន · Bulk upload" subtitle="បញ្ចូលទំនិញ ក្រុមទំនិញ ការពិពណ៌នា ស្តុក និងតម្លៃតាមបរិមាណ ពីឯកសារ Excel · Products, categories, descriptions, stock and price tiers from Excel">
      <Button variant="outline" asChild><Link to="/admin/products"><ArrowLeft className="size-4" />ទំនិញ</Link></Button>
    </PageHead>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <Card><CardContent className="space-y-3 p-5">
        <p className="font-semibold">១. ទាញយកគំរូ · Download template</p>
        <p className="text-sm text-muted-foreground">មានឧទាហរណ៍ ២ ជួរ និងការណែនាំ។ SKU ដែលមានរួច នឹងធ្វើបច្ចុប្បន្នភាពទំនិញនោះ។ · Has 2 example rows and a guide. An existing SKU updates that product.</p>
        <Button onClick={() => void template()}><Download className="size-4" />Template .xlsx</Button>
      </CardContent></Card>
      <Card><CardContent className="space-y-3 p-5">
        <p className="font-semibold">២. ផ្ទុកឯកសារ · Upload file</p>
        <p className="text-sm text-muted-foreground">.xlsx ឬ .csv · រូបភាពបន្ថែមនៅទំព័រទំនិញបន្ទាប់ពីនាំចូល · Add photos per product afterwards.</p>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
          <Upload className="size-4" />ជ្រើសឯកសារ · Choose file
          <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ""; }} />
        </label>
        {fileName && <p className="flex items-center gap-1 text-xs text-muted-foreground"><FileSpreadsheet className="size-4" />{fileName}</p>}
      </CardContent></Card>
    </div>

    {result && <Card className="mt-4"><CardContent className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">៣. ពិនិត្យ · Review — {result.items.length} ត្រឹមត្រូវ · ready, {result.errors.length} កំហុស · errors</p>
        <Button onClick={() => void run()} disabled={!result.items.length || !!progress}>{progress ?? `នាំចូល · Import ${result.items.length}`}</Button>
        {progress && <p className="w-full text-xs text-muted-foreground">កុំបិទទំព័រនេះ · Keep this page open until it finishes</p>}
      </div>
      {result.errors.length > 0 && <ul role="alert" className="space-y-1 rounded-panel bg-destructive-subtle p-3 text-sm text-destructive">{result.errors.map((e) => <li key={e}>{e}</li>)}<li className="pt-1 text-xs">ជួរដែលមានកំហុសនឹងមិនត្រូវនាំចូល · Rows with errors are skipped.</li></ul>}
      {result.newCategories.length > 0 && <p className="rounded-panel bg-warning-subtle p-3 text-sm">ក្រុមទំនិញថ្មីនឹងត្រូវបង្កើត · New categories will be created: <strong>{result.newCategories.join(", ")}</strong></p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs text-muted-foreground"><tr><th className="p-2">SKU</th><th className="p-2">ឈ្មោះ · Name</th><th className="p-2">ក្រុម · Category</th><th className="p-2 text-right">ស្តុក</th><th className="p-2">តម្លៃ · Tiers</th><th className="p-2"></th></tr></thead>
        <tbody>{result.items.map((it) => <tr key={it.sku} className="border-t border-border align-top">
          <td className="p-2 font-sans font-semibold">{it.sku}</td>
          <td className="p-2">{it.name_km}<p className="text-xs text-muted-foreground">{it.name_en}</p>{(it.description_km || it.description_en) && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{it.description_km || it.description_en}</p>}</td>
          <td className="p-2">{it.category || "—"}</td>
          <td className="p-2 text-right font-sans tabular-nums">{it.stock_qty}</td>
          <td className="p-2 font-sans text-xs">{it.tiers.map((t) => `${t.qty_min}+ ${usd(t.price_usd)}`).join(" · ")}</td>
          <td className="p-2 text-xs">{existing.has(it.sku.toLowerCase()) ? "កែប្រែ · update" : "ថ្មី · new"}{!it.active && " · hidden"}</td>
        </tr>)}</tbody>
      </table></div>
    </CardContent></Card>}

    {done && <Card className="mt-4"><CardContent className="space-y-2 p-5">
      <p className="font-semibold text-success">✓ បានបង្កើត {done.created} · កែប្រែ {done.updated} · Created {done.created}, updated {done.updated}</p>
      {done.failed.length > 0 && <ul className="space-y-1 text-sm text-destructive">{done.failed.map((f) => <li key={f}>{f}</li>)}</ul>}
      <Button variant="outline" asChild><Link to="/admin/products">មើលទំនិញ · View products</Link></Button>
    </CardContent></Card>}
  </>;
}
