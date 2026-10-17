import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "../utils";
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { invalid?: boolean }
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, invalid, ...props }, ref) => <input ref={ref} aria-invalid={invalid || undefined} className={cn("h-10 w-full rounded-control border border-input bg-surface px-3 text-sm text-foreground outline-hidden placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/15", className)} {...props} />);
Input.displayName = "Input";
export interface SearchInputProps extends InputProps { containerClassName?: string }
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({ className, containerClassName, ...props }, ref) => <div className={cn("relative", containerClassName)}><Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input ref={ref} className={cn("pl-9", className)} type="search" {...props}/></div>);
SearchInput.displayName = "SearchInput";
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => <select ref={ref} className={cn("h-10 w-full rounded-control border border-input bg-surface px-3 text-sm text-foreground outline-hidden focus:border-primary focus:ring-3 focus:ring-ring/15 disabled:opacity-60", className)} {...props}>{children}</select>);
Select.displayName = "Select";
export interface FieldProps { label: string; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string }
export function Field({ label, hint, error, required, children, className }: FieldProps) { return <label className={cn("grid gap-1.5 text-sm font-medium text-foreground", className)}><span>{label}{required && <span className="text-destructive"> *</span>}</span>{children}{(error || hint) && <span className={cn("text-xs font-normal text-muted-foreground", error && "text-destructive")}>{error ?? hint}</span>}</label>; }
