import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type HomeModuleType = "release" | "playlist" | "mixed";
export type HomeItemType = "release" | "playlist";

export type HomeModuleItemRow = {
  id: string;
  module_id: string;
  item_type: HomeItemType;
  item_id: string;
  position: number;
};

export type HomeModuleRow = {
  id: string;
  title: string;
  module_type: HomeModuleType;
  position: number;
  is_active: boolean;
};

export async function getHomeModules() {
  const totalStart = Date.now();
  const logStep = (label: string, startedAt: number) => {
    console.log(`[get-home-modules] ${label}: ${Date.now() - startedAt}ms`);
  };

  const supabase = await createSupabaseServerClient();
  const modulesStart = Date.now();

  const { data: modules, error: modulesError } = await supabase
    .from("home_modules")
    .select("id,title,module_type,position,is_active")
    .eq("is_active", true)
    .order("position", { ascending: true });
  logStep("home_modules query", modulesStart);

  if (modulesError) throw modulesError;

  const moduleIds = (modules ?? []).map((m) => m.id);
  if (moduleIds.length === 0) return { modules: [], itemsByModuleId: new Map<string, HomeModuleItemRow[]>() };

  const itemsStart = Date.now();

  const { data: items, error: itemsError } = await supabase
    .from("home_module_items")
    .select("id,module_id,item_type,item_id,position")
    .in("module_id", moduleIds)
    .order("position", { ascending: true });
  logStep("home_module_items query", itemsStart);

  if (itemsError) throw itemsError;

  const itemsByModuleId = new Map<string, HomeModuleItemRow[]>();
  for (const it of items ?? []) {
    const arr = itemsByModuleId.get(it.module_id) ?? [];
    arr.push(it as HomeModuleItemRow);
    itemsByModuleId.set(it.module_id, arr);
  }

  logStep("getHomeModules total", totalStart);
  return { modules: (modules ?? []) as HomeModuleRow[], itemsByModuleId };
}
