import { createFileRoute } from '@tanstack/react-router';
import { RequestsWorkspace } from '@/app/RequestsWorkspace';
import { requestsQueryOptions } from '@/app/request-queries';
import { listRequests } from '@/lib/requests.functions';
export const Route=createFileRoute('/_authenticated/store/requests')({
 head:()=>({meta:[{title:'សំណើតម្លៃ និងតាមតម្រូវការ | ProvisionKH'},{name:'description',content:'Send and review your ProvisionKH quotes and custom sourcing requests.'},{property:'og:title',content:'ProvisionKH customer requests'},{property:'og:description',content:'Private quote requests, reference photos and store offers.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 loader:async({context})=>{const options=await requestsQueryOptions();await context.queryClient.ensureQueryData(options);return {optionsKey:options.queryKey};},
 errorComponent:({error})=><p role="alert">{error instanceof Error ? error.message : 'Unable to load requests'}</p>,notFoundComponent:()=> <p>Request not found</p>,component:Page,
});
function Page(){const {optionsKey}=Route.useLoaderData();return <RequestsWorkspace options={{queryKey:optionsKey,queryFn:()=>listRequests(),staleTime:15000,refetchInterval:30000,refetchIntervalInBackground:false}}/>;}
