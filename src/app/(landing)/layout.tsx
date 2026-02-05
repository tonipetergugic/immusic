import AppShell from "@/components/layout/AppShell";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Root <body> bleibt overflow-hidden (für App).
  // Landing bekommt eigenen Scroll-Container.
  return (
    <AppShell
      mainClassName="flex-1 overflow-y-auto overflow-x-hidden"
      innerClassName="min-h-full pb-24 sm:pb-20"
    >
      {children}
    </AppShell>
  );
}
