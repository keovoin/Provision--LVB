import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect,useMemo,useRef,useState } from "react";
import { CheckCircle2, Clock3, Package , MapPin, RotateCcw } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/app/store-context";
import { toCartLine } from "@/app/catalog";
import { renderSVG } from "uqr";
import { Badge,Button,Card,CardContent } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { createPaymentQr, refreshPaymentStatus } from "@/lib/payment.functions";
import { toast } from "sonner";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { homeOptions, ordersOptions, storeScope, type Order } from "@/app/store-queries";
export const Route=createFileRoute("/_authenticated/store/orders")({head:()=>({meta:[{title:"ការបញ្ជាទិញ | ProvisionKH"},{name:"description",content:"Track ProvisionKH wholesale orders and payment status."},{property:"og:title",content:"ProvisionKH Orders"},{property:"og:description",content:"Track wholesale orders."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),loader:async({context})=>{const userId=await storeScope();await context.queryClient.ensureQueryData(ordersOptions(userId));return {userId};},errorComponent:({error})=><p role="alert">{error instanceof Error ? error.message : "Unable to load this page"}</p>,notFoundComponent:()=> <p>Order not found</p>,component:OrdersPage});
function PaymentQr({ value }: { value: string }) { const svg=useMemo(()=>renderSVG(value,{ecc:"H",border:4}),[value]); return <div className="mx-auto mt-3 size-48 overflow-hidden rounded-control bg-surface p-2 [&_svg]:size-full" aria-label="KHQR payment code" dangerouslySetInnerHTML={{__html:svg}}/>; }
function OrdersPage(){
 const {userId}=Route.useLoaderData();
 const queryClient=useQueryClient();
 const {data:orders,refetch}=useSuspenseQuery(ordersOptions(userId));
 const loading=false;
 const [preparing,setPreparing]=useState<string|null>(null);
 const current=useRef(orders);
 useEffect(()=>{current.current=orders},[orders]);
 useEffect(()=>{
  let busy=false;
  const timer=window.setInterval(async()=>{
   if(busy||document.visibilityState!=="visible")return;
   const pending=current.current.filter(o=>o.payments?.status==="pending"&&o.payments.provider_payment_id);
   if(!pending.length)return;
   busy=true;
   try {
    const results=await Promise.allSettled(pending.map(o=>refreshPaymentStatus({data:{paymentId:o.payments?.id??""}})));
    if(results.some(r=>r.status==="fulfilled"&&r.value.status!=="pending"&&r.value.status!=="scanned"))await queryClient.invalidateQueries({queryKey:ordersOptions(userId).queryKey});
   }finally{busy=false;}
  },4000);
  return()=>window.clearInterval(timer);
 },[queryClient,userId]);
 const {addItem}=useStore();const navigate=useNavigate();
 async function orderAgain(o:Order){const {products}=await queryClient.ensureQueryData(homeOptions(userId));let added=0,missing=0;for(const i of o.order_items){const p=products.find(x=>x.id===i.product_id);if(!p||p.stock_qty<1){missing++;continue;}addItem(toCartLine(p),Math.min(i.qty,p.stock_qty));added++;}if(!added){toast.error("ទំនិញទាំងនេះអស់ពីស្តុក · These items are unavailable");return;}if(missing)toast.warning(`${missing} មុខអស់ពីស្តុក · ${missing} item(s) unavailable`);void navigate({to:"/store/cart"});}
 async function prepare(id:string){setPreparing(id);try{await createPaymentQr({data:{paymentId:id}});await refetch()}catch(e){toast.error("មិនអាចបង្កើត KHQR បានទេ · "+(e as Error).message)}finally{setPreparing(null)}}

 return <><div><p className="text-sm font-semibold text-primary">ប្រវត្តិទិញ</p><h1 className="mt-1 text-2xl font-bold">ការបញ្ជាទិញរបាស់អ្នក</h1></div>{loading?<div className="mt-5 h-40 animate-pulse rounded-panel bg-muted"/>:orders.length===0?<div className="py-20 text-center"><Package className="mx-auto size-10 text-muted-foreground"/><p className="mt-3 font-semibold">មិនទាន់មានការបញ្ជាទិញ</p></div>:<div className="mt-5 space-y-3">{orders.map(o=>{const payment=o.payments;return <Card key={o.id}><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><strong className="font-sans">{o.order_no}</strong><p className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("km-KH")}</p></div><Badge variant={o.status==="paid"||o.status==="delivered"?"success":"warning"}>{o.status}</Badge></div>{(o.payment_method==="khqr"||o.payment_method==="link")&&payment?.status==="pending"&&<div className="mt-4 rounded-panel bg-muted p-4 text-center"><Clock3 className="mx-auto size-5 text-warning"/><p className="mt-2 text-sm font-semibold">ស្កេន KHQR ដើម្បីទូទាត់</p>{payment.provider_payment_id&&payment.khqr_code?<><PaymentQr value={payment.khqr_code}/><p className="mt-3 text-xs text-muted-foreground">ស្ថានភាពនឹងធ្វើបច្ចុប្បន្នភាពដោយស្វ័យប្រវត្តិ</p></>:<Button className="mt-3" size="sm" disabled={preparing===payment.id} onClick={()=>prepare(payment.id)}>{preparing===payment.id?"កំពុងរៀបចំ…":"បង្ហាញ KHQR"}</Button>}<Button variant="outline" size="sm" className="mt-3 w-full" asChild><Link to="/store/payment/$paymentId" params={{paymentId:payment.id}}>មើលព័ត៌មានការទូទាត់</Link></Button></div>}{payment?.status==="paid"&&<div className="mt-4 space-y-2"><div className="flex items-center gap-2 rounded-control bg-success-subtle p-3 text-sm text-success"><CheckCircle2 className="size-4"/>បានទូទាត់រួច</div><Button variant="outline" size="sm" className="w-full" asChild><Link to="/store/payment/$paymentId" params={{paymentId:payment.id}}>មើលបង្កាន់ដៃទូទាត់</Link></Button></div>}<Button variant="outline" size="sm" className="mt-3 w-full" asChild><Link to="/receipt/$orderId" params={{orderId:o.id}}>{payment?.status==="paid"?"បង្កាន់ដៃ · Receipt":"វិក្កយបត្រ · Invoice"}</Link></Button><details className="mt-3 rounded-control border border-border p-3 text-sm"><summary className="min-h-8 cursor-pointer font-semibold">ព័ត៌មានលម្អិត · ការទូទាត់ · ការដឹកជញ្ជូន</summary><ul className="mt-2 space-y-1">{o.order_items.map((i,k)=><li key={k} className="flex justify-between gap-2"><span>{i.products?.name_km} × <span className="font-sans">{i.qty}</span> {i.products?.unit_km}</span><span className="font-sans tabular-nums">${Number(i.line_total_usd).toFixed(2)}</span></li>)}</ul><p className="mt-3 text-xs font-semibold text-muted-foreground">ការដឹកជញ្ជូន</p><p className="flex gap-1"><MapPin className="mt-0.5 size-4 shrink-0 text-primary"/>{o.delivery_address}</p>{o.note&&<p className="text-xs text-muted-foreground">{o.note}</p>}{payment&&<><p className="mt-3 text-xs font-semibold text-muted-foreground">ការទូទាត់ <span className="font-sans">{payment.payment_no}</span></p><p>{({cod:"ទូទាត់ពេលទទួល",khqr:"KHQR",link:"តំណទូទាត់",net30:"ឥណទាន"} as Record<string,string>)[payment.method]??payment.method} · <span className="font-sans">${Number(payment.amount_usd).toFixed(2)} · ៛{Number(payment.amount_khr).toLocaleString()}</span></p><p className="text-xs text-muted-foreground">{payment.status==="paid"?`បានទទួល ${payment.settled_at?new Date(payment.settled_at).toLocaleDateString("km-KH"):""}`:payment.credit_due_at?`ផុតកំណត់ ${new Date(payment.credit_due_at).toLocaleDateString("km-KH")}`:"មិនទាន់ទូទាត់"}</p></>}</details><div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm"><span className="text-muted-foreground">សរុប</span><strong className="font-sans text-lg">${o.total_usd.toFixed(2)}</strong></div><Button size="sm" className="mt-3 w-full" onClick={()=>void orderAgain(o)}><RotateCcw className="size-4"/>បញ្ជាទិញម្តងទៀត · Order again</Button></CardContent></Card>})}</div>}</>}