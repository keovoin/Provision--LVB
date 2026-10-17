import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "../utils";
export interface CardProps extends HTMLAttributes<HTMLDivElement> { elevated?: boolean }
export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, elevated, ...props }, ref) => <div ref={ref} className={cn("rounded-panel border border-border bg-surface text-foreground", elevated && "shadow-panel", className)} {...props}/>);
Card.displayName = "Card";
export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {}
export const CardHeader = forwardRef<HTMLDivElement, CardSectionProps>(({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-start justify-between gap-4 border-b border-border px-4 py-3", className)} {...props}/>);
CardHeader.displayName = "CardHeader";
export const CardContent = forwardRef<HTMLDivElement, CardSectionProps>(({ className, ...props }, ref) => <div ref={ref} className={cn("p-4", className)} {...props}/>);
CardContent.displayName = "CardContent";
export interface StatCardProps extends CardProps { label: string; value: string; delta?: string; trend?: "up" | "down" | "flat"; icon?: ReactNode; detail?: string }
export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(({ label, value, delta, trend = "flat", icon, detail, className, ...props }, ref) => <Card ref={ref} className={cn("p-4", className)} {...props}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>{icon && <span className="grid size-9 place-items-center rounded-control bg-secondary text-secondary-foreground">{icon}</span>}</div>{(delta || detail) && <div className="mt-3 flex items-center gap-2 text-xs"><span className={cn("inline-flex items-center font-semibold", trend === "up" && "text-success", trend === "down" && "text-destructive", trend === "flat" && "text-muted-foreground")}>{trend === "up" && <ArrowUpRight className="size-3.5"/>}{trend === "down" && <ArrowDownRight className="size-3.5"/>}{delta}</span><span className="text-muted-foreground">{detail}</span></div>}</Card>);
StatCard.displayName = "StatCard";
