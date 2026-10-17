import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SECTIONS = ["orders", "customers", "products", "categories", "drops", "receivables", "reports", "stock", "pos", "requests"] as const;

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72),
    sections: z.array(z.enum(SECTIONS)).min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!isOwner) throw new Error("មានតែម្ចាស់ហាងប៉ុណ្ណោះ / Owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true, user_metadata: { name: data.name, must_change_password: true },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");
    const id = created.user.id;
    await supabaseAdmin.from("profiles").update({ name: data.name }).eq("id", id);
    const { error: rErr } = await supabaseAdmin.from("user_roles").upsert({ user_id: id, role: "staff" }, { onConflict: "user_id,role" });
    if (rErr) throw new Error(rErr.message);
    const { error: pErr } = await supabaseAdmin.from("staff_permissions").insert(data.sections.map((section) => ({ user_id: id, section })));
    if (pErr) throw new Error(pErr.message);
    return { id };
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(),
    password: z.string().min(8).max(72),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!isOwner) throw new Error("មានតែម្ចាស់ហាងប៉ុណ្ណោះ / Owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
    const targetRoles = (target ?? []).map((r) => r.role);
    if (targetRoles.includes("owner")) throw new Error("Cannot reset an owner's password");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
      user_metadata: { must_change_password: true },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
