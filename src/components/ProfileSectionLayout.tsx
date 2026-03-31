import type { ReactNode } from "react";
import ProfileSectionNav from "@/components/ProfileSectionNav";
import BackLink from "@/components/BackLink";
import type { ProfileSectionKey } from "@/components/profileSectionItems";

type ProfileSectionLayoutProps = {
  title: string;
  description: string;
  current: ProfileSectionKey;
  children: ReactNode;
  showBackLink?: boolean;
};

export default function ProfileSectionLayout({
  title,
  description,
  current,
  children,
  showBackLink = true,
}: ProfileSectionLayoutProps) {
  return (
    <div className="w-full max-w-[896px] mx-auto">
      <div
        className="
          bg-[#0B0B0D]
          border border-[#1A1A1C]
          rounded-2xl
          p-8
          lg:min-h-[1040px]
          shadow-[0_20px_60px_rgba(0,0,0,0.6)]
        "
      >
        {showBackLink ? <BackLink className="mb-6" /> : null}

        <div className="mb-8">
          <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
          <p className="text-[#B3B3B3] mt-1">{description}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-10">
          <aside className="lg:pr-8 lg:border-r lg:border-[#1A1A1C]">
            <ProfileSectionNav current={current} />
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
