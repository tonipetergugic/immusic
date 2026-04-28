import path from "node:path";
import { readFile } from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_FILES = new Set(["waveform.png"]);

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const track = url.searchParams.get("track");
  const file = url.searchParams.get("file");

  if (!track || !file || !ALLOWED_FILES.has(file)) {
    return new Response("Bad request", { status: 400 });
  }

  const outputRoot = path.resolve(process.cwd(), "analysis_engine", "output");
  const requestedPath = path.resolve(outputRoot, track, file);

  if (!requestedPath.startsWith(outputRoot + path.sep)) {
    return new Response("Bad request", { status: 400 });
  }

  try {
    const buffer = await readFile(requestedPath);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
