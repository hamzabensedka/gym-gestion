"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "sheet-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "bottom",
  dismissInstantly = false,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  dismissInstantly?: boolean;
}) {
  const instantMotion = dismissInstantly ? "sheet-instant" : "";

  const sideClass =
    side === "bottom"
      ? "sheet-content-bottom inset-x-0 bottom-0 mt-24 h-auto rounded-t-2xl border-b-0 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      : side === "top"
        ? "sheet-content-top inset-x-0 top-0 mb-24 h-auto rounded-b-2xl border-t-0 data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top"
        : side === "right"
          ? "inset-y-0 end-0 h-full w-3/4 border-e-0 sm:max-w-sm data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
          : "inset-y-0 start-0 h-full w-3/4 border-s-0 sm:max-w-sm data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left";

  return (
    <SheetPortal>
      <SheetOverlay className={instantMotion} />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "bg-card text-card-foreground fixed z-50 flex flex-col gap-4 border border-border shadow-lg",
          instantMotion,
          sideClass,
          className,
        )}
        {...props}
      >
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-muted" />
        {children}
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring absolute end-4 top-4 rounded-full opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetPortal,
  SheetOverlay,
};
