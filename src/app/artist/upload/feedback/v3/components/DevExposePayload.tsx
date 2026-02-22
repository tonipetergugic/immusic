"use client";

import { useEffect } from "react";

type Props = { payload: any };

export default function DevExposePayload({ payload }: Props) {
  useEffect(() => {
    (window as any).__fbPayload = payload;
  }, [payload]);

  return null;
}
