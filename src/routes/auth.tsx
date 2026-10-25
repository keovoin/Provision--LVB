import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button, Card, CardContent, Field, Input, SegmentedControl } from "@/design-system/provisionkh";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import brandMark from "@/assets/logos/provisionkh-mark-square.png";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "ចូលគណនី | SastraKH" }, { name: "description", content: "Sign in or create a SastraKH wholesale customer account." }, { property: "og:title", content: "SastraKH Account" }, { property: "og:description", content: "Access wholesale ordering and operations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("email");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { name: fullName, business_name: businessName } } });
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (mode === "signup" && !result.data.session) { setMessage("សូមពិនិត្យអ៊ីមែលរបាស់អ្នក ដើម្បីបញ្ជាក់គណនី។"); return; }
    const uid = result.data.user?.id;
    const { data: roles } = uid ? await supabase.from("user_roles").select("role").eq("user_id", uid) : { data: [] };
    const isTeam = (roles ?? []).some((r) => r.role === "staff" || r.role === "owner");
    const back = new URLSearchParams(window.location.search).get("redirect");
    if (!isTeam && back && back.startsWith("/") && !back.startsWith("//")) { window.location.assign(back); return; }
    await navigate({ to: isTeam ? "/admin" : "/store" });
  }

  return <div className="grid min-h-dvh bg-background lg:grid-cols-[1.1fr_0.9fr]">
    <section className="hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-3"><img src={brandMark} alt="" className="size-11 rounded-panel bg-surface object-contain p-1"/><strong className="text-xl">SastraKH</strong></div><div className="max-w-xl"><p className="mb-4 text-sm font-semibold opacity-80">ផ្គត់ផ្គង់កាន់តែងាយស្រួល</p><h1 className="text-5xl font-bold leading-tight">ទំនិញលក់ដុំដែលហាងរបាស់អ្នកត្រូវការ</h1><p className="mt-5 max-w-lg text-lg opacity-80">បញ្ជាទិញ តាមដាន និងគ្រប់គ្រងការទូទាត់ក្នុងកន្លែងតែមួយ។</p></div><p className="text-sm opacity-70">Wholesale supply, built for Cambodia.</p></section>
    <section className="flex items-center justify-center p-4 sm:p-8"><Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-card"><CardContent className="p-5 sm:p-8"><div className="mb-7 flex items-center gap-3 lg:hidden"><img src={brandMark} alt="" className="size-14 shrink-0 object-contain"/><strong className="font-sans text-xl font-bold">SastraKH</strong></div><p className="text-sm font-semibold text-primary">សូមស្វាគមន៍</p><h2 className="mt-1 text-2xl font-bold">{mode === "signin" ? "ចូលគណនី" : "បង្កើតគណនីអាជីវកម្ម"}</h2><p className="mt-2 text-sm text-muted-foreground">{mode === "signin" ? "បន្តទៅហាងលក់ដុំរបាស់អ្នក" : "ចាប់ផ្តើមបញ្ជាទិញសម្រាប់ហាងរបាស់អ្នក"}</p>

      <div className="mt-6 flex justify-center"><SegmentedControl items={[{ value: "email", label: "អ៊ីមែល" }, { value: "phone", label: "ទូរស័ព្ទ" }]} value={method} onValueChange={(value) => { setMethod(value); setMessage(""); }}/></div>

      {method === "email" ? <>
        <form className="mt-7 space-y-4" onSubmit={submit}>{mode === "signup" && <><Field label="ឈ្មោះពេញ"><Input name="fullName" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)}/></Field><Field label="ឈ្មោះអាជីវកម្ម"><Input name="businessName" required autoComplete="organization" value={businessName} onChange={(e) => setBusinessName(e.target.value)}/></Field></>}<Field label="អ៊ីមែល"><Input name="email" type="email" required autoComplete="email" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)}/></Field><Field label="ពាក្យសម្ងាត់"><div className="relative"><Input name="password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)}/><button type="button" className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-muted-foreground" onClick={() => setShowPassword((value) => !value)} aria-label="បង្ហាញពាក្យសម្ងាត់">{showPassword ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}</button></div></Field>{message && <p className="rounded-control bg-muted p-3 text-sm text-foreground" role="status">{message}</p>}<Button type="button" className="w-full" size="lg" disabled={busy} onClick={() => submit()}>{busy ? "កំពុងដំណើរការ…" : mode === "signin" ? "ចូលគណនី" : "បង្កើតគណនី"}<ArrowRight className="size-4"/></Button></form>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>ឬ<span className="h-px flex-1 bg-border"/></div><Button variant="outline" className="w-full" onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" })}>បន្តជាមួយ Google</Button><button type="button" className="mt-6 w-full text-sm text-muted-foreground" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? "មិនទាន់មានគណនី? បង្កើតគណនី" : "មានគណនីរួចហើយ? ចូលគណនី"}</button>
      </> : <>
        <div className="mt-7 rounded-control bg-muted p-4 text-center">
          <p className="text-sm font-semibold">លេខទូរស័ព្ទ</p>
          <p className="mt-1 text-sm text-muted-foreground">ការចូលគណនីតាមទូរស័ព្ទ នឹងមាននៅឆាប់ៗនេះ។ សូមប្រើអ៊ីមែល ឬ Google ជាមុនសិន។</p>
          <p className="mt-1 text-xs text-muted-foreground">Sign in with your phone — coming soon. Please use email or Google for now.</p>
        </div>
      </>}
    </CardContent></Card></section>
  </div>;
}
