import { deleteTrackAction } from "../[id]/actions";

export async function POST(req: Request) {
  const formData = await req.formData();
  await deleteTrackAction(formData);
  return new Response("OK", { status: 200 });
}

