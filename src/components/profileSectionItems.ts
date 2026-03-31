import { User, CreditCard, Settings, Mail } from "lucide-react";

export type ProfileSectionKey = "profile" | "account" | "settings" | "messages";

export const profileSectionItems = [
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
