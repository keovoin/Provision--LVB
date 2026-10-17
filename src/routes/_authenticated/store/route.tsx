import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/app/StoreShell";

export const Route = createFileRoute("/_authenticated/store")({ component: StoreShell });