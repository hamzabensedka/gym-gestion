import { cn } from "@/lib/utils";

export function StaggerGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("stagger-group", className)}>{children}</div>;
}
