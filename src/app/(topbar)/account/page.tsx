import { redirect } from "next/navigation";

export default function LegacyAccountRedirectPage() {
  redirect("/dashboard/account");
}

