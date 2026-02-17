// utils.ts – reine Helper, keine Business-Logik

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function clamp100(x: number): number {
  return Math.max(0, Math.min(100, x));
}

