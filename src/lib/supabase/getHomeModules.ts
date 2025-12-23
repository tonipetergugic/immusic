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
  const supabase = await createSupabaseServerClient();

  const { data: modules, error: modulesError } = await supabase
    .from("home_modules")
    .select("id,title,module_type,position,is_active")
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (modulesError) throw modulesError;

  const moduleIds = (modules ?? []).map((m) => m.id);
  if (moduleIds.length === 0) return { modules: [], itemsByModuleId: new Map<string, HomeModuleItemRow[]>() };

  const { data: items, error: itemsError } = await supabase
    .from("home_module_items")
    .select("id,module_id,item_type,item_id,position")
    .in("module_id", moduleIds)
    .order("position", { ascending: true });

  if (itemsError) throw itemsError;

  const itemsByModuleId = new Map<string, HomeModuleItemRow[]>();
  for (const it of items ?? []) {
    const arr = itemsByModuleId.get(it.module_id) ?? [];
    arr.push(it as HomeModuleItemRow);
    itemsByModuleId.set(it.module_id, arr);
  }

  return { modules: (modules ?? []) as HomeModuleRow[], itemsByModuleId };
}
