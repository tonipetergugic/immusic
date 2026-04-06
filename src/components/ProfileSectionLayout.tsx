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
    <div className="mx-auto w-full max-w-[1040px] text-white">
      {showBackLink ? <BackLink className="mb-8" /> : null}

      <div className="border-b border-white/10 pb-8">
        <h1 className="mt-3 text-4xl font-semibold tracking-tight leading-tight">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#B3B3B3]">
          {description}
        </p>
      </div>

      <div className="grid gap-10 pt-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-12">
        <aside className="lg:border-r lg:border-white/10 lg:pr-8">
          <div className="lg:sticky lg:top-6">
            <ProfileSectionNav current={current} />
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
