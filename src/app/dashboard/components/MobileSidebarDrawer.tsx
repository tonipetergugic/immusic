"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";

export default function MobileSidebarDrawer() {
  const [open, setOpen] = useState(false);

  // ESC schließt Drawer
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="
          inline-flex items-center justify-center
          h-10 w-10 rounded-full
          border border-neutral-800
          bg-neutral-900/40
          text-white/80
          hover:text-white hover:border-neutral-700
          transition
        "
      >
        <Menu size={18} />
      </button>

      {/* Overlay + Drawer */}
      {open ? (
        <div className="fixed inset-0 z-[999999] md:hidden">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <div
            className="
              absolute left-0 top-0 h-full w-[280px]
              bg-[#0E0E10] border-r border-neutral-900
              shadow-2xl
            "
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-900">
              <span className="text-sm font-semibold text-white/90">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="
                  inline-flex items-center justify-center
                  h-10 w-10 rounded-full
                  border border-neutral-800
                  bg-neutral-900/40
                  text-white/80
                  hover:text-white hover:border-neutral-700
                  transition
                "
              >
                <X size={18} />
              </button>
            </div>

            {/* Same Sidebar content */}
            <div
              className="h-full overflow-y-auto"
              onClick={() => setOpen(false)}
            >
              <Sidebar />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
