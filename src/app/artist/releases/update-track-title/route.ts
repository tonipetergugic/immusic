import { updateTrackTitleAction } from "../[id]/actions";

export async function POST(req: Request) {
  const formData = await req.formData();
  await updateTrackTitleAction(formData);
  return new Response("OK", { status: 200 });
}

