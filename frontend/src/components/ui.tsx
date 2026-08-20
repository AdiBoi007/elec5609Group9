import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ChevronRight, X } from "lucide-react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const classes = className.trim().split(/\s+/).filter(Boolean);
  const hasBackground = classes.some((value) => value.startsWith("bg-"));
  const hasRadius = classes.some((value) => value.startsWith("rounded-"));
  const hasShadow = classes.some((value) => value.startsWith("shadow-"));
  const removesBorder = classes.includes("border-0");
  return (
    <section
      className={`${hasRadius ? "" : "rounded-card"} ${removesBorder ? "" : "border border-line"} ${hasBackground ? "" : "bg-surface"} ${hasShadow ? "" : "shadow-card"} ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div>
        <h2 className="text-xl font-bold tracking-[-0.025em] text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function MetricStrip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid overflow-hidden rounded-[22px] border border-line bg-surface shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function MetricItem({
  label,
  value,
  detail,
  icon,
  accent = "bg-ink",
  onClick,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  accent?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-muted">{label}</span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className="mt-2 text-[26px] font-bold leading-none tracking-[-0.045em] text-ink">{value}</div>
      {detail && <div className="mt-2 truncate text-xs text-muted">{detail}</div>}
      <div className={`mt-3 h-1 w-8 rounded-full ${accent}`} />
    </>
  );
  const className = "min-w-0 border-b border-line p-4 text-left last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${className} transition hover:bg-black/[0.018] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/20`}>
      {content}
    </button>
  ) : <div className={className}>{content}</div>;
}

export function CompactRow({
  title,
  detail,
  leading,
  trailing,
  onClick,
}: {
  title: string;
  detail?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const content = <>
    {leading && <div className="shrink-0">{leading}</div>}
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-ink">{title}</p>
      {detail && <div className="mt-0.5 truncate text-xs text-muted">{detail}</div>}
    </div>
    {trailing ?? (onClick ? <ChevronRight size={16} className="shrink-0 text-muted" /> : null)}
  </>;
  const classes = "flex w-full items-center gap-3 border-b border-line py-3 text-left last:border-b-0";
  return onClick ? <button type="button" onClick={onClick} className={`${classes} rounded-lg px-1 transition hover:bg-black/[0.02]`}>{content}</button> : <div className={classes}>{content}</div>;
}

export function PillButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-full bg-surface-muted p-1" role="tablist">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${value === option ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-[28px] bg-surface p-7 text-ink shadow-2xl ${className || "max-w-lg"}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-[-0.03em] text-ink">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-surface-muted text-ink hover:bg-surface-elevated"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DetailDrawer({
  title,
  eyebrow,
  children,
  onClose,
  footer,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = overflow; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 animate-fade-in bg-black/20 backdrop-blur-[2px]" onMouseDown={onClose} role="presentation">
      <aside
        className="absolute inset-y-0 right-0 flex w-full animate-drawer-in flex-col bg-surface text-ink shadow-2xl sm:max-w-[520px] sm:rounded-l-[26px]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-start gap-4 border-b border-line px-5 py-5 sm:px-7">
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{eyebrow}</p>}
            <h2 className="text-2xl font-bold tracking-[-0.035em] text-ink">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-ink transition hover:bg-surface-elevated" aria-label="Close">
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
        {footer && <footer className="border-t border-line bg-surface px-5 py-4 sm:px-7">{footer}</footer>}
      </aside>
    </div>
  );
}

export function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface-muted px-3.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-coral/45 focus:bg-surface focus:ring-4 focus:ring-coral/[0.08] disabled:cursor-not-allowed disabled:opacity-55";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[32px] font-bold leading-none tracking-[-0.045em] text-ink md:text-[36px]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </header>
  );
}
