import DashboardHomeClient from "./DashboardHomeClient";
import { getHomeModules } from "@/lib/supabase/getHomeModules";
import { getFeaturedRelease } from "@/lib/supabase/getFeaturedRelease";

export default async function DashboardPage() {
  const { modules, itemsByModuleId } = await getHomeModules();
  const featuredRelease = await getFeaturedRelease();

  // Map ist nicht serialisierbar -> in plain object umwandeln
  const obj: Record<string, any[]> = {};
  for (const [k, v] of itemsByModuleId.entries()) obj[k] = v;

  return (
    <DashboardHomeClient
      home={{ modules, itemsByModuleId: obj }}
      featuredRelease={featuredRelease}
    />
  );
}
