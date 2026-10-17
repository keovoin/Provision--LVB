import { z } from 'zod';
export const requestSchema = z.object({ id: z.string().uuid(), kind: z.enum(['quote','custom']), subject: z.string().trim().min(1).max(160), details: z.string().trim().min(1).max(20000), images: z.array(z.string().max(300)).max(8) });
export const replySchema = z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(20000), amount: z.number().min(0).max(9999999999).multipleOf(0.01).nullable() });
export const decisionSchema = z.object({ requestId: z.string().uuid(), messageId: z.string().uuid(), accept: z.boolean() });
export function canDecideOffer(customerId: string, userId: string, status: string, offerStatus: string | null) { return customerId === userId && status === 'quoted' && offerStatus === 'open'; }
