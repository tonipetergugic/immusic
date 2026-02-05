import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";

export default function StandaloneLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      mainClassName="flex-1 overflow-y-auto overflow-x-hidden"
      innerClassName="px-6 pt-6 pb-12 sm:px-8 sm:pt-8"
    >
      {children}
    </AppShell>
  );
}

