"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-xs font-medium uppercase tracking-wide text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(labelVariants(), className)}
      {...props}
    />
  );
}

function Input({ className, type, readOnly, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      data-lpignore="true"
      data-1p-ignore=""
      data-lastpass-ignore=""
      readOnly={readOnly}
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border border-border bg-input px-4 py-2 text-base text-foreground shadow-sm transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-lg border border-border bg-input px-4 py-3 text-base text-foreground shadow-sm transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-11 w-full appearance-none rounded-lg border border-border bg-input px-4 py-2 text-base text-foreground shadow-sm transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function Field({
  label,
  children,
  hint,
  skeletonClassName = "h-11",
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  skeletonClassName?: string;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="space-y-2"
      data-lpignore="true"
      data-1p-ignore=""
      data-lastpass-ignore=""
    >
      <Label>{label}</Label>
      {mounted ? (
        children
      ) : (
        <div
          aria-hidden
          className={cn(
            "w-full rounded-lg border border-border bg-input",
            skeletonClassName,
          )}
        />
      )}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export { Input, Textarea, Select, Label, Field, labelVariants };
