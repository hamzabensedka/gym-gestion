import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 items-center justify-center rounded-[22%] bg-brand text-primary-foreground",
        className,
      )}
      role="img"
      aria-label="Gym Gestion"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-[55%]"
        aria-hidden
      >
        <rect x="4" y="14" width="4" height="6" rx="1" opacity="0.85" />
        <rect x="10" y="10" width="4" height="10" rx="1" />
        <rect x="16" y="16" width="4" height="4" rx="1" opacity="0.85" />
      </svg>
    </span>
  );
}
