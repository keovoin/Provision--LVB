import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils";
const badgeVariants = cva("inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold", { variants: { variant: { neutral: "bg-muted text-muted-foreground", primary: "bg-secondary text-secondary-foreground", success: "bg-success-subtle text-success", warning: "bg-warning-subtle text-warning", destructive: "bg-destructive-subtle text-destructive", info: "bg-info/10 text-info" } }, defaultVariants: { variant: "neutral" } });
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, ...props }, ref) => <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}/>);
Badge.displayName = "Badge";
export interface StatusIndicatorProps extends BadgeProps { pulse?: boolean }
export const StatusIndicator = forwardRef<HTMLSpanElement, StatusIndicatorProps>(({ children, pulse, variant = "neutral", ...props }, ref) => <Badge ref={ref} variant={variant} {...props}><span className={cn("size-1.5 rounded-full bg-current", pulse && "animate-pulse")}/>{children}</Badge>);
StatusIndicator.displayName = "StatusIndicator";
