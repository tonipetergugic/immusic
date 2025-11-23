import { uploadTrackAction } from "@/app/artist/upload/actions";

export async function POST(req: Request) {
  const form = await req.formData();
  await uploadTrackAction(form);
  return new Response("OK");
}

