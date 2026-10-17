import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../utils";

const buttonVariants = cva("inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold transition-colors outline-hidden focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover",
      secondary: "bg-secondary text-secondary-foreground hover:bg-primary/10",
      outline: "border border-border bg-surface text-foreground hover:bg-muted",
      ghost: "text-foreground hover:bg-muted",
      destructive: "bg-destructive text-white hover:bg-destructive/90",
    },
    size: { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-sm", icon: "size-10 p-0" },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
export { buttonVariants };
