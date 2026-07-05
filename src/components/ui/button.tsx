import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-brand/90 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-critical/90 active:scale-[0.98]",
        outline:
          "border border-border bg-transparent text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-accent",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-brand/90 active:scale-[0.98]",
        tinted:
          "bg-muted text-foreground shadow-sm hover:bg-accent",
        danger:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-critical/90 active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-md gap-1.5 px-3 text-xs",
        md: "h-11 px-4 py-2",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "primary",
  size = "md",
  static: isStatic,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    static?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  const resolvedVariant =
    variant === "primary" ? "default" : variant === "danger" ? "destructive" : variant;

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant: resolvedVariant, size }),
        !isStatic && "active:not-disabled:scale-[0.98]",
        className,
      )}
      {...props}
    />
  );
}

export { Button, buttonVariants };
