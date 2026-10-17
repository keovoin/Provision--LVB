import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../utils";
import { Button, type ButtonProps } from "./Button";
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { label: string; variant?: ButtonProps["variant"]; size?: "sm" | "md" }
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ label, className, variant = "ghost", size = "md", ...props }, ref) => <Button ref={ref} aria-label={label} title={label} variant={variant} size="icon" className={cn(size === "sm" && "size-8", className)} {...props} />);
IconButton.displayName = "IconButton";
