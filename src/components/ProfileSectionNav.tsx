"use client";

import Link from "next/link";
import { User, CreditCard, Settings, Mail } from "lucide-react";

type ProfileSectionNavProps = {
  current: "profile" | "account" | "settings" | "messages";
};

const items = [
  {
    key: "profile",
    label: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
  {
    key: "account",
    label: "Account",
    href: "/dashboard/account",
    icon: CreditCard,
  },
  {
    key: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    key: "messages",
    label: "Messages",
    href: "/dashboard/messages",
    icon: Mail,
  },
] as const;

export default function ProfileSectionNav({
  current,
}: ProfileSectionNavProps) {
  return (
    <nav aria-label="Profile sections" className="w-full">
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = item.key === current;
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors cursor-pointer
                ${
                  isActive
                    ? "bg-[#161619] text-[#00FFC6]"
                    : "text-white hover:bg-[#161619] hover:text-[#00FFC6]"
                }
              `}
            >
              <Icon
                size={18}
                className={isActive ? "text-[#00FFC6]" : "text-white"}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

