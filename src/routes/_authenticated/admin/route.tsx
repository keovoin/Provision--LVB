import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/app/AdminShell";
export const Route=createFileRoute("/_authenticated/admin")({component:AdminShell});