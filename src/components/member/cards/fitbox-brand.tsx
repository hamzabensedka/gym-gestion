const YELLOW = "#f5c518";

export function FitBoxLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className={className} aria-label="FitBox Mahdia">
        <div className="flex items-center gap-2">
          <div className="relative flex size-8 shrink-0 items-center justify-center">
            <span
              className="text-[1.35rem] font-black leading-none"
              style={{ color: YELLOW }}
            >
              B
            </span>
            <span
              className="pointer-events-none absolute inset-0 rotate-[-24deg] scale-110"
              style={{
                background:
                  "linear-gradient(115deg, transparent 42%, #0a0a0a 46%, #0a0a0a 54%, transparent 58%)",
              }}
              aria-hidden
            />
          </div>
          <div className="leading-none">
            <p
              className="text-[10px] font-black tracking-[0.22em]"
              style={{ color: YELLOW }}
            >
              FITBOX
            </p>
            <p
              className="mt-0.5 text-[7px] font-bold tracking-[0.28em] opacity-80"
              style={{ color: YELLOW }}
            >
              MAHDIA
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} aria-label="FitBox Mahdia">
      <div className="flex items-center gap-3">
        <div className="relative flex size-11 shrink-0 items-center justify-center">
          <span
            className="text-[2rem] font-black leading-none"
            style={{ color: YELLOW }}
          >
            B
          </span>
          <span
            className="pointer-events-none absolute inset-0 rotate-[-24deg] scale-110"
            style={{
              background:
                "linear-gradient(115deg, transparent 42%, #0a0a0a 46%, #0a0a0a 54%, transparent 58%)",
            }}
            aria-hidden
          />
        </div>
        <div className="leading-none">
          <p
            className="text-sm font-black tracking-[0.2em]"
            style={{ color: YELLOW }}
          >
            FITBOX
          </p>
          <p
            className="mt-1 text-[9px] font-bold tracking-[0.26em] opacity-80"
            style={{ color: YELLOW }}
          >
            MAHDIA
          </p>
        </div>
      </div>
    </div>
  );
}

export function HazardStripe({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        backgroundImage: `repeating-linear-gradient(
          -45deg,
          #0a0a0a,
          #0a0a0a 5px,
          ${YELLOW} 5px,
          ${YELLOW} 10px
        )`,
      }}
      aria-hidden
    />
  );
}
