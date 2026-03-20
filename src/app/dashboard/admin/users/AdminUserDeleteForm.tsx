"use client";

import React from "react";

export default function AdminUserDeleteForm({
  action,
  displayName,
  email,
}: {
  action: string;
  displayName: string | null;
  email: string | null;
}) {
  return (
    <form
      action={action}
      method="post"
      onSubmit={(e) => {
        const label = displayName || email || "this user";
        const ok = window.confirm(
          `Delete ${label} permanently? This cannot be undone.`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="confirm" value="DELETE" />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-transparent px-3 py-2 text-sm font-medium text-red-300 transition hover:border-red-400 hover:text-red-200"
      >
        Delete
      </button>
    </form>
  );
}

