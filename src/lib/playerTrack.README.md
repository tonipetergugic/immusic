# PlayerTrack Architecture (IMUSIC)

## Rules (non-negotiable)
- Public URLs (`audio_url`, `cover_url`) are built server-side only (Server Components / API Routes / server libs).
- Client Components must NOT call Supabase Storage and must NOT build public URLs.
- `toPlayerTrack()` / `toPlayerTrackList()` are pure mappers (no side effects, no env, no Supabase).
- `audio_url` is required. Missing `audio_url` is a server/API bug and must be surfaced (no `?? ""`).

## Allowed places for `getPublicUrl()`
- Server Components
- API Routes
- Server libs (e.g. `*.server.ts`)
Exception: upload preview right after upload (UI-only).

## Review checklist
- No `getPublicUrl()` in `"use client"` files (except upload preview).
- No `audio_url ?? ""` or `audio_url: ""`.
- `toPlayerTrack()` is called with explicit allowed fields only (no spreading DB rows).

