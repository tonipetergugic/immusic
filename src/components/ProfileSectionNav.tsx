"use client";

import Link from "next/link";
import { profileSectionItems, type ProfileSectionKey } from "@/components/profileSectionItems";

type ProfileSectionNavProps = {
  current: ProfileSectionKey;
};

export default function ProfileSectionNav({
  current,
}: ProfileSectionNavProps) {
  return (
    <nav aria-label="Profile sections" className="w-full">
      <div className="flex flex-col gap-1">
        {profileSectionItems.map((item) => {
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

