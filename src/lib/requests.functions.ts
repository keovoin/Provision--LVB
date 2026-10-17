import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { requestSchema, replySchema, decisionSchema } from '@/app/request-rules';
export const listRequests = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async ({context})=>{
 const {data:access,error:accessError}=await context.supabase.rpc('can_access',{_user_id:context.userId,_section:'requests'});
 if(accessError) throw new Error(accessError.message);
 const {data,error}=await context.supabase.from('customer_requests').select('*,request_images(*),request_messages(*)').order('updated_at',{ascending:false});
 if(error) throw new Error(error.message);
 const rows=await Promise.all((data??[]).map(async r=>({...r,request_messages:r.request_messages.sort((a,b)=>a.created_at.localeCompare(b.created_at)),request_images:await Promise.all(r.request_images.sort((a,b)=>a.sort_order-b.sort_order).map(async i=>{const signed=await context.supabase.storage.from('request-images').createSignedUrl(i.storage_path,3600);return {...i,url:signed.data?.signedUrl??''};}))})));
 return {rows,userId:context.userId,staff:!!access};
});
export const submitRequest = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(d=>requestSchema.parse(d)).handler(async ({data,context})=>{
 const {data:id,error}=await context.supabase.rpc('submit_customer_request',{_id:data.id,_kind:data.kind,_subject:data.subject,_details:data.details,_images:data.images}); if(error) throw new Error(error.message);return id;
});
export const replyRequest = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(d=>replySchema.parse(d)).handler(async ({data,context})=>{
 const {error}=await context.supabase.rpc('reply_customer_request',{_id:data.id,_body:data.body,...(data.amount!==null?{_amount:data.amount}:{})}); if(error) throw new Error(error.message);return {ok:true};
});
export const decideOffer = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).validator(d=>decisionSchema.parse(d)).handler(async ({data,context})=>{
 const {error}=await context.supabase.rpc('decide_request_offer',{_request_id:data.requestId,_message_id:data.messageId,_accept:data.accept});if(error) throw new Error(error.message);return {ok:true};
});
