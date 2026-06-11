import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
        secondary: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        destructive: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        outline: "border border-current",
        live: "bg-red-500 text-white animate-pulse",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
