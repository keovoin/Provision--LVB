import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProvisionKH | ហាងលក់ដុំ" },
      { name: "description", content: "Order wholesale essentials from ProvisionKH." },
      { property: "og:title", content: "ProvisionKH | ហាងលក់ដុំ" },
      { property: "og:description", content: "Order wholesale essentials from ProvisionKH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/store" });
  },
});
