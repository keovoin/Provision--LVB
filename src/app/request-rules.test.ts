import { describe, expect, it } from 'vitest';
import { requestSchema, canDecideOffer, replySchema } from './request-rules';
const base = { id: '550e8400-e29b-41d4-a716-446655440000', subject:'Bulk supplies', details:'Need 100 cartons', images:[] };
describe('customer requests',()=>{
 it('supports quote and custom requests with long details and multiple images',()=>{ for(const kind of ['quote','custom']) expect(requestSchema.safeParse({...base,kind,details:'a'.repeat(15000),images:['one.jpg','two.jpg']}).success).toBe(true); });
 it('only the requesting customer can decide an open offer',()=>{expect(canDecideOffer('buyer','buyer','quoted','open')).toBe(true);expect(canDecideOffer('buyer','other','quoted','open')).toBe(false);});
 it('closed and superseded offers cannot be decided',()=>{expect(canDecideOffer('buyer','buyer','accepted','open')).toBe(false);expect(canDecideOffer('buyer','buyer','quoted','superseded')).toBe(false);});
 it('supports informational replies without amount',()=>{expect(replySchema.safeParse({id:base.id,body:'Please specify size',amount:null}).success).toBe(true);});
  it('accepts 20000 characters and eight images, rejecting larger submissions',()=>{expect(requestSchema.safeParse({...base,kind:'custom',details:'a'.repeat(20000),images:Array(8).fill('one.jpg')}).success).toBe(true);expect(requestSchema.safeParse({...base,kind:'custom',details:'a'.repeat(20001)}).success).toBe(false);expect(requestSchema.safeParse({...base,kind:'quote',images:Array(9).fill('one.jpg')}).success).toBe(false);});
  it('rejects empty subjects, empty details and negative offers',()=>{expect(requestSchema.safeParse({...base,kind:'quote',subject:'  '}).success).toBe(false);expect(requestSchema.safeParse({...base,kind:'custom',details:'  '}).success).toBe(false);expect(replySchema.safeParse({id:base.id,body:'Offer',amount:-1}).success).toBe(false);});
});
