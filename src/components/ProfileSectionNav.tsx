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
      <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-[#7A7A7A]">
        Sections
      </div>

      <div className="flex flex-col">
        {profileSectionItems.map((item) => {
          const isActive = item.key === current;
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`
                group flex items-center gap-3 border-l-2 py-3 pl-4 text-sm transition-colors
                ${
                  isActive
                    ? "border-[#00FFC6] text-[#00FFC6]"
                    : "border-transparent text-[#B3B3B3] hover:border-white/15 hover:text-white"
                }
              `}
            >
              <Icon
                size={18}
                className={
                  isActive
                    ? "text-[#00FFC6]"
                    : "text-[#8A8A8A] transition-colors group-hover:text-white"
                }
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

