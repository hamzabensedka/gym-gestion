import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-4 rounded-xl border border-border p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-sm font-semibold leading-none text-foreground", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

type Tone = "default" | "success" | "danger" | "warning" | "brand";

const toneText: Record<Tone, string> = {
  default: "text-foreground",
  success: "text-brand",
  danger: "text-critical",
  warning: "text-foreground",
  brand: "text-brand",
};

const toneIconBg: Record<Tone, string> = {
  default: "bg-muted text-foreground",
  success: "bg-brand/15 text-brand",
  danger: "bg-critical-muted text-critical",
  warning: "bg-accent text-foreground",
  brand: "bg-brand/15 text-brand",
};

function StatCard({
  label,
  value,
  tone = "default",
  icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  tone?: Tone;
  icon?: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={cn("gap-3 p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              toneIconBg[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className={cn("tnum text-3xl font-bold tracking-tight", toneText[tone])}>
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

function GroupedSection({
  title,
  children,
  className,
  footer,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  footer?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title ? (
        <h3 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      ) : null}
      <div className="ios-group">{children}</div>
      {footer ? (
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">{footer}</p>
      ) : null}
    </section>
  );
}

function GroupedRow({
  children,
  className,
  interactive,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "ios-row",
        interactive && "ios-row-interactive cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  StatCard,
  GroupedSection,
  GroupedRow,
};
