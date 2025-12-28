"use client";

import { useEffect, useState } from "react";
import Tooltip from "@/components/Tooltip";

export default function AnalyticsDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (exportOpen) {
        setExportOpen(false);
        return;
      }

      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, exportOpen]);

  if (!open) {
    if (exportOpen) setExportOpen(false);
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        aria-label="Close drawer overlay"
        onClick={() => {
          setExportOpen(false);
          onClose();
        }}
        className="absolute inset-0 bg-black/60"
      />

      <div className="absolute right-0 top-0 h-full w-full max-w-[520px] border-l border-white/10 bg-[#0E0E10] shadow-[0_0_60px_rgba(0,0,0,0.55)]">
        <div className="h-full flex flex-col">
          <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">{title}</p>
              <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-full border border-white/10 bg-black/20">
                <span className="h-2 w-2 rounded-full bg-[#00FFC6]" />
                <span className="text-xs text-[#B3B3B3]">Range: Last 28 days (preview)</span>
              </div>
              {subtitle ? (
                <p className="text-sm text-[#B3B3B3] mt-1">{subtitle}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((v) => !v)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
                >
                  Export
                </button>

                {exportOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-[#0E0E10] shadow-[0_0_40px_rgba(0,0,0,0.55)] overflow-hidden">
                    {[
                      { label: "Export as PNG", hint: "Chart image (later)" },
                      { label: "Export as CSV", hint: "Raw data (later)" },
                      { label: "Export as PDF", hint: "Report (later)" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setExportOpen(false)}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 transition"
                      >
                        <p className="text-sm text-white/90">{item.label}</p>
                        <p className="text-xs text-[#B3B3B3] mt-0.5">{item.hint}</p>
                      </button>
                    ))}
                    <div className="px-4 py-3 border-t border-white/10">
                      <Tooltip label="Coming soon" placement="bottom">
                        <p className="text-xs text-[#B3B3B3]">
                          Exports will be enabled when data is connected.
                        </p>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

