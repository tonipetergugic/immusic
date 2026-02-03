"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type BackLinkProps = {
  label?: string;
  className?: string;
  href?: string;
};

const linkClassName = [
  "inline-flex items-center gap-2",
  "text-white/70",
  "hover:text-[#00FFC6] active:text-[#00FFC6]",
  "transition-colors",
  "text-base",
].join(" ");

const iconClassName = `
  w-5 h-5
  transition-all
  hover:drop-shadow-[0_0_10px_rgba(0,255,198,0.6)]
  active:drop-shadow-[0_0_14px_rgba(0,255,198,0.8)]
`;

const spanClassName = `
  transition-all
  hover:drop-shadow-[0_0_10px_rgba(0,255,198,0.6)]
  active:drop-shadow-[0_0_14px_rgba(0,255,198,0.8)]
`;

export default function BackLink({ label = "Back", className = "", href }: BackLinkProps) {
  const router = useRouter();

  const content = (
    <>
      <ArrowLeft className={iconClassName} />
      <span className={spanClassName}>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={[linkClassName, className].join(" ")}
        aria-label={label}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={[linkClassName, className].join(" ")}
      aria-label={label}
    >
      {content}
    </button>
  );
}
