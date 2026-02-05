import type { ReactNode } from "react";

// Layout-Regel (verbindlich):
// - AppShell ist die einzige Quelle für max-width, horizontales Padding und Top/Bottom-Spacing.
// - Pages/Client-Komponenten dürfen KEINE eigenen Outer-Wrapper setzen (kein max-w-*, mx-auto, px-* auf Root-Level).
// - Ausnahme: Modals/Dialogs/Overlays dürfen eine eigene Breite haben (z.B. max-w-md), weil sie nicht Teil des Page-Layouts sind.

export default function AppShell({
  sidebar,
  header,
  children,
  mainClassName = "flex-1 overflow-y-auto overflow-x-hidden",
  innerClassName = "w-full max-w-[1200px] mx-auto px-3 pt-6 pb-40 sm:px-4 sm:pt-8 lg:px-6 lg:pb-48",
}: {
  sidebar?: ReactNode;
  header?: ReactNode;
  children: ReactNode;
  mainClassName?: string;
  innerClassName?: string;
}) {
  return (
    <div className="flex h-screen w-full bg-[#0E0E10] text-white overflow-hidden">
      {sidebar}

      <div className="flex flex-col flex-1 overflow-hidden">
        {header ? <header className="shrink-0">{header}</header> : null}

        <main className={mainClassName}>
          <div className={innerClassName}>{children}</div>
        </main>
      </div>
    </div>
  );
}

