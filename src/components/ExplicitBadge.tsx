"use client";

type ExplicitBadgeProps = {
  className?: string;
};

export default function ExplicitBadge({ className = "" }: ExplicitBadgeProps) {
  return (
    <span
      className={[
        "shrink-0 inline-flex items-center justify-center",
        "h-4 min-w-4 px-1 rounded-[4px]",
        "bg-white/12 text-white/70",
        "text-[10px] font-semibold leading-none",
        className,
      ].join(" ")}
      title="Explicit content"
      aria-label="Explicit content"
    >
      E
    </span>
  );
}
