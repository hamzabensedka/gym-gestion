import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

const whatsappStyles =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] font-semibold text-white shadow-sm transition-all hover:bg-[#20bd5a] active:scale-[0.98]";

export function WhatsAppLink({
  href,
  label,
  iconOnly,
  className,
  title,
}: {
  href: string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title ?? label}
      aria-label={title ?? label}
      className={cn(
        whatsappStyles,
        iconOnly ? "h-11 flex-1" : "h-11 px-4 text-sm",
        className,
      )}
    >
      <WhatsAppIcon className={cn(iconOnly ? "size-5" : "size-5 shrink-0")} />
      {!iconOnly && label ? <span>{label}</span> : null}
    </a>
  );
}
