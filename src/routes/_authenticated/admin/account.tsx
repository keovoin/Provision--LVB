import { createFileRoute } from "@tanstack/react-router";
import { ChangePasswordForm } from "@/app/ChangePassword";
import { usePrefs } from "@/app/prefs";

export const Route = createFileRoute("/_authenticated/admin/account")({
  head: () => ({ meta: [{ title: "My account — SastraKH Admin" }, { name: "description", content: "Change your SastraKH staff password." }, { property: "og:title", content: "My account — SastraKH Admin" }, { property: "og:description", content: "Change your SastraKH staff password." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Account,
});

function Account() {
  const { lang } = usePrefs();
  return <div className="max-w-md rounded-panel border border-border bg-surface p-6">
    <h1 className="mb-4 text-lg font-semibold">{lang === "en" ? "Change password" : "ប្តូរពាក្យសម្ងាត់"}</h1>
    <ChangePasswordForm />
  </div>;
}
