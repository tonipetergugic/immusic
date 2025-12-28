"use client";

import { useState } from "react";

export default function Tooltip({
  label,
  placement = "top",
  children,
}: {
  label: string;
  placement?: "top" | "bottom";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}

      {open && (
        <span
          className={`absolute z-[90] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-[#0E0E10] px-3 py-2 text-xs text-white shadow-[0_0_30px_rgba(0,0,0,0.55)] ${
            placement === "top" ? "-top-10" : "top-10"
          }`}
        >
          {label}
        </span>
      )}
    </span>
  );
}

