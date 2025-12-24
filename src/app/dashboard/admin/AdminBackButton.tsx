"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminBackButton() {
  const pathname = usePathname();

  // Auf der Admin-Startseite kein Back-Button
  if (pathname === "/dashboard/admin") {
    return null;
  }

  return (
    <Link
      href="/dashboard/admin"
      className="
        text-sm text-[#B3B3B3]
        hover:text-[#00FFC6]
        transition-colors
      "
    >
      ← Back
    </Link>
  );
}

