"use client";

import { logout } from "@/app/logout/action";

export function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="text-white hover:text-[#00FFC6] transition"
    >
      Logout
    </button>
  );
}

