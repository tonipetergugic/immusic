"use client";

import { useEffect, useRef, useState } from "react";

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
  const ref = useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  return (
    <span
      className="relative inline-flex"
      ref={ref}
      onMouseEnter={() => {
        const el = ref.current;
        if (el) {
          const r = el.getBoundingClientRect();
          setPos({ left: r.left + r.width / 2, top: r.top });
        }
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
    >
      {children}

      {open && pos && (
        <span
          className={`fixed z-[90] rounded-xl border border-white/10 bg-[#0E0E10] px-3 py-2 text-xs text-white shadow-[0_0_30px_rgba(0,0,0,0.55)] max-w-[280px] whitespace-normal break-words leading-relaxed`}
          style={{
            left: pos.left,
            top: placement === "top" ? pos.top - 12 : pos.top + 28,
            transform:
              placement === "top"
                ? "translateX(-50%) translateY(-100%)"
                : "translateX(-50%) translateY(0%)",
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

