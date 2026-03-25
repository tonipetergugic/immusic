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
    href: "/artist/invites",
    icon: Mail,
  },
] as const;

export default function ProfileSectionNav({
  current,
}: ProfileSectionNavProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const isActive = item.key === current;
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition cursor-pointer
                ${
                  isActive
                    ? "border border-[#00FFC633] bg-[#00FFC60D] text-[#00FFC6]"
                    : "border border-[#1A1A1C] bg-[#111113] text-[#B3B3B3] hover:border-[#00FFC622] hover:text-white"
                }
              `}
            >
              <Icon
                size={16}
                className={isActive ? "text-[#00FFC6]" : "text-[#B3B3B3]"}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

