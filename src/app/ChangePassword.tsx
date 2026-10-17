import { useState } from "react";
import { Button, Input } from "@/design-system/provisionkh";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs } from "./prefs";

export async function clearFirstLoginFlag() {
  await supabase.auth.updateUser({ data: { must_change_password: false } });
}

export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const { lang } = usePrefs();
  const L = (km: string, en: string) => (lang === "en" ? en : km);
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [err, setErr] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(""); setOk(false);
    if (pw.length < 8) return setErr(L("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៨ តួ", "Password must be at least 8 characters"));
    if (pw !== pw2) return setErr(L("ពាក្យសម្ងាត់មិនដូចគ្នា", "Passwords don't match"));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw, data: { must_change_password: false } });
    setBusy(false);
    if (error) return setErr(error.message);
    setOk(true); setPw(""); setPw2(""); onDone?.();
  };
  return <div className="space-y-3">
    <label className="block text-sm font-medium">{L("ពាក្យសម្ងាត់ថ្មី", "New password")}
      <Input type="password" autoComplete="new-password" className="mt-1" value={pw} invalid={!!err} onChange={(e) => setPw(e.target.value)} /></label>
    <label className="block text-sm font-medium">{L("បញ្ជាក់ពាក្យសម្ងាត់", "Confirm password")}
      <Input type="password" autoComplete="new-password" className="mt-1" value={pw2} invalid={!!err} onChange={(e) => setPw2(e.target.value)} /></label>
    {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
    {ok && <p className="text-sm text-success">{L("បានប្តូរពាក្យសម្ងាត់", "Password changed")}</p>}
    <Button type="button" disabled={busy} onClick={submit}>{L("ប្តូរពាក្យសម្ងាត់", "Change password")}</Button>
  </div>;
}
