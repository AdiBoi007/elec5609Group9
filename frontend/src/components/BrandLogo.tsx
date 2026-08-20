import { useId } from "react";

type BrandMarkProps = {
  className?: string;
  title?: string;
};

export function BrandMark({ className = "size-9", title = "Circle Health" }: BrandMarkProps) {
  const gradientId = `circle-health-gradient-${useId().replace(/:/g, "")}`;

  return (
    <svg
      aria-label={title}
      className={className}
      role="img"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={gradientId} x1="10" x2="39" y1="7" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b8dc00" />
          <stop offset="0.48" stopColor="#70c94b" />
          <stop offset="1" stopColor="#00b7b2" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${gradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.35">
        <path d="M32.7 7.9A18.2 18.2 0 1 0 39 34.5" />
        <path d="M22.1 38.4V26.7" />
        <path d="M22.1 31.8c-5.7-.2-9.7-3.5-10.8-8.7 5.8-.1 9.8 3.1 10.8 8.7Z" />
        <path d="M22.1 26.7c.7-6.2 4.4-10.2 10.7-11.1-.2 6.1-4.2 10.1-10.7 11.1Z" />
      </g>
      <circle cx="37.3" cy="10.4" r="1.9" fill={`url(#${gradientId})`} />
    </svg>
  );
}

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  nameClassName?: string;
  hideName?: boolean;
};

export function BrandLogo({ className = "", markClassName, nameClassName = "", hideName = false }: BrandLogoProps) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      <BrandMark className={markClassName} />
      {!hideName && (
        <span className={`whitespace-nowrap font-semibold tracking-[-0.04em] ${nameClassName}`}>
          <span>Circle </span>
          <span className="bg-gradient-to-r from-[#9dce1c] via-[#59bf62] to-[#00aaa7] bg-clip-text text-transparent">
            Health
          </span>
        </span>
      )}
    </span>
  );
}
