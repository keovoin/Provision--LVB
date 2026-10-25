import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SastraKH | ហាងលក់ដុំ" },
      { name: "description", content: "Order wholesale essentials from SastraKH." },
      { property: "og:title", content: "SastraKH | ហាងលក់ដុំ" },
      { property: "og:description", content: "Order wholesale essentials from SastraKH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/store" });
  },
});
