export function PageHeader({
  title,
  subtitle,
  action,
  large = true,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-3 pb-1">
      <div>
        <h1
          className={
            large
              ? "text-balance text-3xl font-bold tracking-tight text-foreground"
              : "text-balance text-lg font-semibold text-foreground"
          }
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-pretty text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 pb-1">{action}</div> : null}
    </div>
  );
}
