import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  moduleId: string;
  orderedIds: string[];
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const moduleId = (body.moduleId || "").trim();
  const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds : [];

  if (!moduleId || orderedIds.length === 0) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const { error: rpcError } = await supabase.rpc("set_home_module_positions", {
    p_module_id: moduleId,
    p_ordered_ids: orderedIds,
  });

  if (rpcError) {
    return NextResponse.json(
      { ok: false, error: rpcError.message },
      { status: 500 }
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/releases");

  return NextResponse.json({ ok: true });
}

