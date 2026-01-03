import DashboardHomeClient from "./DashboardHomeClient";
import { getHomeModules } from "@/lib/supabase/getHomeModules";
import { getHomeReleases } from "@/lib/supabase/getHomeReleases";

export default async function DashboardPage() {
  const { modules, itemsByModuleId } = await getHomeModules();

  // Map ist nicht serialisierbar -> in plain object umwandeln
  const obj: Record<string, any[]> = {};
  for (const [k, v] of itemsByModuleId.entries()) obj[k] = v;

  const releaseModule = modules.find((m: any) => m.module_type === "release") ?? null;
  const releaseItems = releaseModule ? (obj[releaseModule.id] ?? []) : [];

  const releaseIds = Array.from(
    new Set(
      releaseItems
        .filter((it: any) => it.item_type === "release")
        .sort((a: any, b: any) => a.position - b.position)
        .slice(0, 10)
        .map((it: any) => it.item_id)
    )
  );

  const releasesById = await getHomeReleases(releaseIds);

  return <DashboardHomeClient home={{ modules, itemsByModuleId: obj }} releasesById={releasesById} />;
}
