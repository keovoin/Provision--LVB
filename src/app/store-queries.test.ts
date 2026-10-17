import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("./catalog", () => ({ signPhotos: vi.fn() }));
import { homeOptions, ordersOptions } from "./store-queries";

describe("store navigation caching", () => {
  it("reuses a catalog read when revisiting the same customer's store", async () => {
    const client = new QueryClient();
    const read = vi.fn(async () => ({ products: [], categories: [], storefrontContent: null, photos: {} }));
    const options = { ...homeOptions("customer-a"), queryFn: read };
    await client.ensureQueryData(options);
    await client.ensureQueryData(options);
    expect(read).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it("does not share another customer's order cache", () => {
    const client = new QueryClient();
    client.setQueryData(ordersOptions("customer-a").queryKey, [{ id: "order-a", order_no: "PK-1", status: "pending", total_usd: 10, created_at: "2026-10-09T00:00:00Z", payment_method: "cod", delivery_address: "", note: null, order_items: [], payments: null }]);
    expect(client.getQueryData(ordersOptions("customer-b").queryKey)).toBeUndefined();
    client.clear();
  });

  it("deduplicates simultaneous order reads", async () => {
    const client = new QueryClient();
    const read = vi.fn(async () => []);
    const options = { ...ordersOptions("customer-a"), queryFn: read };
    await Promise.all([client.ensureQueryData(options), client.ensureQueryData(options)]);
    expect(read).toHaveBeenCalledTimes(1);
    client.clear();
  });
});