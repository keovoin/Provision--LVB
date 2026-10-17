import { queryOptions } from '@tanstack/react-query';
import { listRequests } from '@/lib/requests.functions';
import { supabase } from '@/integrations/supabase/client';
export async function requestsQueryOptions() { const {data}=await supabase.auth.getUser(); return queryOptions({queryKey:['customer-requests',data.user?.id],queryFn:()=>listRequests(),staleTime:15000,refetchInterval:30000,refetchIntervalInBackground:false}); }
