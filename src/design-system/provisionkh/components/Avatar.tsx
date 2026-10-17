import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../utils";
export interface AvatarProps extends HTMLAttributes<HTMLDivElement> { src?: string; alt: string; fallback: string; size?: "sm" | "md" | "lg" }
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(({ src, alt, fallback, size = "md", className, ...props }, ref) => <div ref={ref} className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-semibold text-secondary-foreground", size === "sm" && "size-8 text-xs", size === "md" && "size-10 text-sm", size === "lg" && "size-12 text-base", className)} {...props}>{src ? <img src={src} alt={alt} className="size-full object-cover"/> : <span aria-label={alt}>{fallback}</span>}</div>);
Avatar.displayName = "Avatar";
