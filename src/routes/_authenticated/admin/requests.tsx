import { createFileRoute } from '@tanstack/react-router';
import { RequestsWorkspace } from '@/app/RequestsWorkspace';
import { requestsQueryOptions } from '@/app/request-queries';
import { listRequests } from '@/lib/requests.functions';
export const Route=createFileRoute('/_authenticated/admin/requests')({
 head:()=>({meta:[{title:'សំណើអតិថិជន | ProvisionKH Ops'},{name:'description',content:'Review customer quote and custom requests and reply with detailed offers.'},{property:'og:title',content:'ProvisionKH request inbox'},{property:'og:description',content:'Manage private customer requests and quotations.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 loader:async({context})=>{const options=await requestsQueryOptions();await context.queryClient.ensureQueryData(options);return {optionsKey:options.queryKey};},
 errorComponent:({error})=><p role="alert">{error instanceof Error ? error.message : 'Unable to load requests'}</p>,notFoundComponent:()=> <p>Request not found</p>,component:Page,
});
function Page(){const {optionsKey}=Route.useLoaderData();return <RequestsWorkspace admin options={{queryKey:optionsKey,queryFn:()=>listRequests(),staleTime:15000,refetchInterval:30000,refetchIntervalInBackground:false}}/>;}
