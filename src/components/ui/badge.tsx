import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-critical-border bg-critical-muted text-critical",
        outline: "text-foreground border-border",
        neutral: "border-transparent bg-muted text-muted-foreground",
        success: "border border-brand/30 bg-brand/10 text-brand",
        danger: "border-critical-border bg-critical-muted text-critical",
        warning: "border border-border bg-accent text-foreground",
        brand: "border-transparent bg-brand text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeTone = "neutral" | "success" | "danger" | "warning" | "brand";

function Badge({
  className,
  variant,
  tone,
  dot = false,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    tone?: BadgeTone;
    dot?: boolean;
  }) {
  const Comp = asChild ? Slot : "span";
  const resolvedVariant = tone ?? variant ?? "neutral";

  const dotColor: Record<BadgeTone, string> = {
    neutral: "bg-muted-foreground",
    success: "bg-brand",
    danger: "bg-critical",
    warning: "bg-foreground",
    brand: "bg-primary-foreground",
  };

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      {dot && tone ? (
        <span className={cn("size-1.5 rounded-full", dotColor[tone])} />
      ) : null}
      {children}
    </Comp>
  );
}

export { Badge, badgeVariants };
