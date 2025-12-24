"use server";

import { getReleaseQueueForPlayerServer } from "@/lib/getReleaseQueue.server";

export async function getReleaseQueueAction(releaseId: string) {
  return getReleaseQueueForPlayerServer(releaseId);
}

