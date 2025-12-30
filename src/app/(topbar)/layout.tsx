import type { ReactNode } from "react";

export default function StandaloneLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full overflow-hidden bg-[#0E0E10] text-white">
      <main className="h-full overflow-y-auto p-10">
        {children}
      </main>
    </div>
  );
}

