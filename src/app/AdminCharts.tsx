import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { SPAN, bucketOrders, startOf, step, type Range, type Row } from "@/app/chart-buckets";
import { STATUS_KM, Tabs, usd } from "@/app/admin-ui";

const STATUS_COLOR: Record<string, string> = { pending: "var(--color-warning)", paid: "var(--color-success)", picking: "var(--color-info)", out_for_delivery: "var(--color-primary)", delivered: "var(--color-success)", cancelled: "var(--color-destructive)" };

export function AdminCharts() {
  const [range, setRange] = useState<Range>("daily");
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    const from = step(startOf(new Date(), range), range, -(SPAN[range] - 1));
    setRows(null);
    void supabase.from("orders").select("status,total_usd,created_at").gte("created_at", from.toISOString()).limit(5000).then(({ data }) => setRows((data ?? []) as Row[]));
  }, [range]);
  const { buckets } = useMemo(() => bucketOrders(rows ?? [], range), [rows, range]);
  const statuses = useMemo(() => { const c: Record<string, number> = {}; for (const o of rows ?? []) c[o.status] = (c[o.status] ?? 0) + 1; return Object.entries(c).map(([k, v]) => ({ key: k, name: STATUS_KM[k] ?? k, value: v })); }, [rows]);
  const total = buckets.reduce((s, b) => s + b.revenue, 0);
  const axis = { fontSize: 11, fill: "var(--color-muted-foreground)" };
  const tip = { contentStyle: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 } };

  return <div className="mt-5 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><strong>និន្នាការលក់</strong><p className="text-xs text-muted-foreground">Sales trend · <span className="font-sans tabular-nums">{usd(total)}</span></p></div>
      <Tabs value={range} onChange={setRange} items={[["daily", "ប្រចាំថ្ងៃ"], ["weekly", "ប្រចាំសប្តាហ៍"], ["monthly", "ប្រចាំខែ"]]} />
    </div>
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardContent className="p-4"><p className="mb-2 text-sm font-semibold">ចំណូល · Revenue (USD)</p>
        <div className="h-64">{rows ? <ResponsiveContainer><BarChart data={buckets}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} /><XAxis dataKey="label" tick={axis} interval="preserveStartEnd" /><YAxis tick={axis} width={48} /><Tooltip {...tip} formatter={(v: number) => usd(v)} /><Bar dataKey="revenue" name="ចំណូល" fill="var(--color-primary)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="h-full animate-pulse rounded-control bg-muted" />}</div>
      </CardContent></Card>
      <Card><CardContent className="p-4"><p className="mb-2 text-sm font-semibold">ស្ថានភាពការបញ្ជាទិញ · Order status</p>
        <div className="h-64">{rows ? statuses.length ? <ResponsiveContainer><PieChart><Pie data={statuses} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>{statuses.map((s) => <Cell key={s.key} fill={STATUS_COLOR[s.key] ?? "var(--color-muted-foreground)"} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer> : <p className="pt-20 text-center text-sm text-muted-foreground">គ្មានទិន្នន័យ</p> : <div className="h-full animate-pulse rounded-control bg-muted" />}</div>
      </CardContent></Card>
    </div>
    <Card><CardContent className="p-4"><p className="mb-2 text-sm font-semibold">ចំនួនការបញ្ជាទិញ · Orders trend</p>
      <div className="h-56">{rows ? <ResponsiveContainer><LineChart data={buckets}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} /><XAxis dataKey="label" tick={axis} interval="preserveStartEnd" /><YAxis tick={axis} width={32} allowDecimals={false} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="orders" name="ការបញ្ជាទិញ" stroke="var(--color-primary)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="cancelled" name="បោះបង់" stroke="var(--color-destructive)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <div className="h-full animate-pulse rounded-control bg-muted" />}</div>
    </CardContent></Card>
  </div>;
}
