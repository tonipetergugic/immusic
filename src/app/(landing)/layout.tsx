export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Root <body> bleibt overflow-hidden (für App).
  // Landing bekommt eigenen Scroll-Container.
  return (
    <div className="h-dvh overflow-y-auto overflow-x-hidden pb-24 sm:pb-20">
      {children}
    </div>
  );
}
