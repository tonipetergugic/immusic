# IMUSIC Full Platform Audit (Read-Only)

**Datum:** 2025-01-27  
**Audit-Typ:** Strict Read-Only (keine Code-Änderungen)  
**Next.js:** 15.5.9, React 18.2  
**Supabase:** JS 2.83, @supabase/ssr 0.7

---

## Section A: Executive Summary

1. **KRITISCH:** `getReleaseQueue.ts` ist eine Client-Datei, die `getPublicUrl()` verwendet – Verstoß gegen Architektur-Regel (Storage-URLs müssen serverseitig sein).

2. **HOCH:** Viele Client-Komponenten verwenden `createBrowserClient()` direkt mit `process.env.NEXT_PUBLIC_*` statt der zentralen `createSupabaseBrowserClient()` Funktion.

3. **HOCH:** `src/app/artist/analytics/page.tsx` führt Client-seitige Supabase-Queries für read-heavy Analytics-Daten aus, die serverseitig prefetched werden sollten.

4. **HOCH:** Cache-Busting für Avatare/Banner ist inkonsistent: Manche Stellen verwenden `updated_at`, andere `Date.now()` als Fallback (kann zu ständigen Reloads führen).

5. **MEDIUM:** Topbar lädt User-Profile bei jedem Mount neu, obwohl diese Daten serverseitig verfügbar sein könnten.

6. **MEDIUM:** `src/app/(topbar)/profile/page.tsx` führt mehrere Supabase-Queries im Client aus (auth.getUser, profiles.select) – könnte serverseitig sein.

7. **MEDIUM:** Fehlende Error-Boundaries in mehreren Seiten-Komponenten; Fehler werden nur geloggt, nicht an User kommuniziert.

8. **NIEDRIG:** API Route `/api/storage/public-url` existiert, wird aber nur in einem Fall verwendet (`PlaylistAddTrackModal`); könnte konsolidiert werden.

9. **NIEDRIG:** `getReleaseQueue.ts` (Client) und `getReleaseQueue.server.ts` (Server) haben ähnliche Logik – Duplikation.

10. **NIEDRIG:** Banner-Upload in `BannerUpload.tsx` verwendet `getPublicUrl()` im Client (erlaubt für Upload-Preview, aber sollte dokumentiert sein).

---

## Section B: Findings Table

| Severity | Area | File | Line(s) | Evidence | Risk | Recommendation |
|----------|------|------|---------|----------|------|----------------|
| **Critical** | Client/Server Separation | `src/lib/getReleaseQueue.ts` | 1-85 | Client-Datei verwendet `getPublicUrl()` für Storage-URLs | Verstoß gegen Architektur-Regel: Storage-URLs müssen serverseitig sein | Datei löschen oder zu Server-Funktion migrieren; Client sollte API-Route `/api/releases/[id]/queue` verwenden |
| **High** | Client/Server Separation | `src/app/artist/analytics/page.tsx` | 52, 116 | `createSupabaseBrowserClient()` für Analytics-Queries | Analytics-Daten sollten serverseitig prefetched werden | Analytics-Daten in Server Component laden, Client nur für UI-State |
| **High** | Client/Server Separation | `src/app/(topbar)/profile/page.tsx` | 22-25, 85-89 | Direkte Supabase-Queries im Client für Profile-Daten | Unnötige Client-Queries; könnte serverseitig sein | Profile-Daten als Props von Server Component übergeben |
| **High** | Env Usage | `src/app/(topbar)/profile/page.tsx` | 23-24 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent mit zentraler `createSupabaseBrowserClient()` | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/app/dashboard/components/Topbar.tsx` | 31-32 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/components/PlaylistAddTrackModal.tsx` | 59-60 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/components/TrackOptionsTrigger.tsx` | 45-46 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/components/PlaylistDetailsModal.tsx` | 30-31 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/app/dashboard/artist/[id]/FollowCountsClient.tsx` | 24-25 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/components/TrackOptionsMenu.tsx` | 49-50 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/app/dashboard/artist/[id]/SaveArtistButton.tsx` | 16-17 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/app/dashboard/artist/[id]/FollowArtistButton.tsx` | 14-15 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/app/dashboard/playlist/[id]/PlaylistClient.tsx` | 52-53 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/components/AddTrackModal.tsx` | 18-19 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/app/(topbar)/account/page.tsx` | 13-14 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Env Usage | `src/components/CreatePlaylistModal.tsx` | 22-23 | `process.env.NEXT_PUBLIC_*` direkt verwendet | Inkonsistent | `createSupabaseBrowserClient()` verwenden |
| **High** | Cache-Busting | `src/app/(topbar)/profile/page.tsx` | 97 | `Date.now()` als Fallback für `updated_at` | Kann zu ständigen Reloads führen | Nur `updated_at` verwenden, kein `Date.now()` Fallback |
| **High** | Cache-Busting | `src/app/dashboard/artist/[id]/page.tsx` | 232 | `Date.now()` als Fallback für `updated_at` | Kann zu ständigen Reloads führen | Nur `updated_at` verwenden |
| **High** | Cache-Busting | `src/app/(topbar)/profile/[id]/page.tsx` | 312 | `Date.now()` als Fallback für `updated_at` | Kann zu ständigen Reloads führen | Nur `updated_at` verwenden |
| **Medium** | Query Cost | `src/app/dashboard/components/Topbar.tsx` | 36-62 | Lädt User-Profile bei jedem Mount | Unnötige Queries; sollte serverseitig sein | Profile-Daten als Props übergeben |
| **Medium** | Query Cost | `src/app/dashboard/artist/[id]/page.tsx` | 38-47, 52-57, 59-64, 66-71, 177-201 | Mehrere separate Queries pro Render | Könnte konsolidiert werden | Queries mit `Promise.all()` parallelisieren oder in eine Query konsolidieren |
| **Medium** | Query Cost | `src/app/dashboard/library/page.tsx` | 55-58, 65-68, 84-88 | Separate Queries für own/saved playlists | Könnte in eine Query konsolidiert werden | UNION oder Subquery verwenden |
| **Medium** | Error Handling | `src/app/dashboard/playlist/[id]/page.tsx` | 35-37 | Keine Error-Behandlung wenn Playlist nicht gefunden | User sieht nur "Playlist not found" ohne Kontext | `notFound()` verwenden oder Error-Boundary |
| **Medium** | Error Handling | `src/app/dashboard/library/page.tsx` | 60-62, 70-72, 90-92 | Errors werden nur geloggt, nicht an User kommuniziert | User sieht keine Fehlermeldungen | Error-States anzeigen |
| **Medium** | Error Handling | `src/app/dashboard/artist/[id]/page.tsx` | 220-224 | Error wird nur geloggt | User sieht keine Fehlermeldung | Error-State anzeigen |
| **Medium** | Reliability | `src/app/dashboard/playlist/[id]/page.tsx` | 92-94 | `throw new Error()` wenn `audio_url` fehlt | Kann Page-Crash verursachen | Graceful Fallback oder `notFound()` |
| **Medium** | Reliability | `src/app/dashboard/library/page.tsx` | 175-177 | `throw new Error()` wenn `audio_url` fehlt | Kann Page-Crash verursachen | Graceful Fallback |
| **Medium** | Reliability | `src/app/dashboard/artist/[id]/page.tsx` | 138-142 | `throw new Error()` wenn `audio_url` fehlt | Kann Page-Crash verursachen | Graceful Fallback |
| **Low** | Code Duplication | `src/lib/getReleaseQueue.ts` vs `src/lib/getReleaseQueue.server.ts` | - | Ähnliche Logik in Client und Server | Wartungsaufwand | Client-Version entfernen, nur Server-Version behalten |
| **Low** | API Routes | `src/app/api/storage/public-url/route.ts` | - | Wird nur in `PlaylistAddTrackModal` verwendet | Unnötige API-Route | Entweder entfernen oder dokumentieren warum nötig |
| **Low** | Architecture | `src/app/artist/profile/BannerUpload.tsx` | 94 | `getPublicUrl()` im Client (Upload-Preview) | Erlaubt, aber sollte dokumentiert sein | Kommentar hinzufügen dass dies Upload-Preview-Exception ist |
| **Low** | Architecture | `src/app/artist/releases/[id]/ReleaseCoverUploader.tsx` | 43 | `getPublicUrl()` im Client (Upload-Preview) | Erlaubt, aber sollte dokumentiert sein | Kommentar hinzufügen |

---

## Section C: Cost Hotspots (ranked)

### 1. **`src/app/dashboard/artist/[id]/page.tsx`** (HIGHEST)
- **Queries pro Render:** 6+ separate Queries
  - Profile (1)
  - Follower/Following counts (2 via Promise.all)
  - Releases (1)
  - Public Playlists (1)
  - Top Tracks Analytics (1)
  - Release Tracks (1)
  - Library Artists check (1)
- **Problem:** Viele sequenzielle Queries, einige könnten parallelisiert werden
- **Empfehlung:** 
  - Follower/Following counts bereits parallelisiert (gut)
  - Top Tracks Query könnte mit Release Tracks kombiniert werden
  - Library Artists check könnte in initial Query integriert werden

### 2. **`src/app/dashboard/library/page.tsx`**
- **Queries pro Render:** 3-4 Queries (abhängig von Tab)
  - Own Playlists (1)
  - Saved Playlists (1)
  - Combined Playlists (1)
  - Library Tracks (1 mit Joins)
- **Problem:** Separate Queries für own/saved, dann nochmal für Details
- **Empfehlung:** UNION Query oder Subquery verwenden

### 3. **`src/app/dashboard/components/Topbar.tsx`**
- **Queries pro Mount:** 2 Queries
  - `auth.getUser()` (1)
  - `profiles.select()` (1)
- **Problem:** Lädt bei jedem Mount neu, auch wenn User sich nicht geändert hat
- **Empfehlung:** Profile-Daten serverseitig laden und als Props übergeben

### 4. **`src/app/artist/analytics/page.tsx`**
- **Queries pro Tab-Wechsel:** 2+ Queries
  - Analytics Summary (1 via API)
  - Top Tracks (1 via API)
  - Track Titles (1 Client-Query)
- **Problem:** Client-seitige Queries für read-heavy Daten
- **Empfehlung:** Alle Analytics-Daten serverseitig prefetchen

### 5. **`src/app/(topbar)/profile/page.tsx`**
- **Queries pro Mount:** 2 Queries
  - `auth.getUser()` (1)
  - `profiles.select()` (1)
- **Problem:** Könnte serverseitig sein
- **Empfehlung:** Server Component verwenden

### 6. **`src/app/dashboard/playlist/[id]/page.tsx`**
- **Queries pro Render:** 2 Queries
  - Playlist (1)
  - Playlist Tracks (1 mit Joins)
  - User Ratings (1, optional)
- **Status:** Gut optimiert mit Joins

### 7. **`src/app/dashboard/track/[id]/page.tsx`**
- **Queries pro Render:** 2 Queries
  - Track (1 mit Joins)
  - Viewer Profile (1, optional)
- **Status:** Gut optimiert

### 8. **`src/app/dashboard/release/[id]/page.tsx`**
- **Queries:** Nicht analysiert (Datei nicht vollständig gelesen)
- **Empfehlung:** Prüfen ob ähnliche Optimierungen möglich

### 9. **`src/app/artist/releases/page.tsx`**
- **Queries:** Client-seitige Queries für Releases
- **Empfehlung:** Serverseitig prefetchen

### 10. **`src/components/PlaylistAddTrackModal.tsx`**
- **Queries:** 1 API-Call zu `/api/tracks/published`
- **Status:** Gut, verwendet API-Route

---

## Section D: Architecture Compliance Checklist

| Rule | Status | Notes |
|------|--------|-------|
| **Storage URLs serverseitig** | ❌ **FAIL** | `getReleaseQueue.ts` (Client) verwendet `getPublicUrl()` |
| **Keine `audio_url ?? ""` Fallbacks** | ✅ **PASS** | Keine weichen Fallbacks gefunden |
| **`toPlayerTrack()` ist pure** | ✅ **PASS** | Keine Side-Effects, keine Env-Vars |
| **Client Components keine read-heavy Queries** | ❌ **FAIL** | `analytics/page.tsx`, `profile/page.tsx`, `Topbar.tsx` |
| **Keine `process.env` direkt in Client** | ❌ **FAIL** | 15+ Dateien verwenden `process.env.NEXT_PUBLIC_*` direkt |
| **Upload-Preview Exception dokumentiert** | ⚠️ **PARTIAL** | `BannerUpload.tsx`, `ReleaseCoverUploader.tsx` verwenden `getPublicUrl()` (erlaubt), aber nicht dokumentiert |
| **API Routes konsistent** | ✅ **PASS** | Alle Queue-Routes verwenden `toPlayerTrackList()` |
| **Cache-Busting konsistent** | ❌ **FAIL** | `Date.now()` Fallbacks in 3 Dateien |
| **Error Handling vorhanden** | ⚠️ **PARTIAL** | Viele Errors werden nur geloggt, nicht an User kommuniziert |
| **Keine N+1 Patterns** | ✅ **PASS** | Keine Loops mit per-Item Queries gefunden |

---

## Section E: Suggested Fix Plan

### Phase 1: Critical Fixes (höchste Priorität)

**Step 1.1: Entferne Client-Version von `getReleaseQueue`**
- **Datei:** `src/lib/getReleaseQueue.ts`
- **Aktion:** Datei löschen oder zu Server-Funktion migrieren
- **Commit:** `refactor: remove client-side getReleaseQueue, use API route instead`
- **Begründung:** Verstoß gegen Architektur-Regel (Storage-URLs müssen serverseitig sein)

**Step 1.2: Konsolidiere `createSupabaseBrowserClient()` Usage**
- **Dateien:** Alle 15+ Dateien die `process.env.NEXT_PUBLIC_*` direkt verwenden
- **Aktion:** Ersetze `createBrowserClient(process.env...)` mit `createSupabaseBrowserClient()`
- **Commit:** `refactor: use centralized createSupabaseBrowserClient() helper`
- **Begründung:** Konsistenz, einfachere Wartung

**Step 1.3: Fix Cache-Busting Fallbacks**
- **Dateien:** `profile/page.tsx`, `dashboard/artist/[id]/page.tsx`, `profile/[id]/page.tsx`
- **Aktion:** Entferne `Date.now()` Fallbacks, verwende nur `updated_at` oder `null`
- **Commit:** `fix: remove Date.now() fallback from cache-busting URLs`
- **Begründung:** `Date.now()` verursacht ständige Reloads

### Phase 2: High Priority (Performance)

**Step 2.1: Migriere Analytics zu Server Components**
- **Datei:** `src/app/artist/analytics/page.tsx`
- **Aktion:** Analytics-Daten serverseitig prefetchen, Client nur für UI-State
- **Commit:** `perf: move analytics data fetching to server components`
- **Begründung:** Reduziert Client-Queries, bessere Performance

**Step 2.2: Optimiere Artist Page Queries**
- **Datei:** `src/app/dashboard/artist/[id]/page.tsx`
- **Aktion:** Konsolidiere Queries wo möglich, parallelisiere mit `Promise.all()`
- **Commit:** `perf: optimize artist page queries with parallelization`
- **Begründung:** Reduziert Query-Zeit

**Step 2.3: Migriere Profile Page zu Server Component**
- **Datei:** `src/app/(topbar)/profile/page.tsx`
- **Aktion:** Profile-Daten serverseitig laden, als Props übergeben
- **Commit:** `refactor: move profile page to server component`
- **Begründung:** Reduziert Client-Queries

**Step 2.4: Optimiere Library Page Queries**
- **Datei:** `src/app/dashboard/library/page.tsx`
- **Aktion:** Kombiniere own/saved Playlist-Queries mit UNION oder Subquery
- **Commit:** `perf: consolidate library playlist queries`
- **Begründung:** Reduziert Query-Anzahl

### Phase 3: Medium Priority (Reliability)

**Step 3.1: Verbessere Error Handling**
- **Dateien:** `dashboard/playlist/[id]/page.tsx`, `dashboard/library/page.tsx`, `dashboard/artist/[id]/page.tsx`
- **Aktion:** Error-States anzeigen statt nur loggen, `notFound()` verwenden wo passend
- **Commit:** `feat: improve error handling with user-visible error states`
- **Begründung:** Bessere UX, User sieht was schief läuft

**Step 3.2: Graceful Fallbacks für fehlende `audio_url`**
- **Dateien:** `dashboard/playlist/[id]/page.tsx`, `dashboard/library/page.tsx`, `dashboard/artist/[id]/page.tsx`
- **Aktion:** Statt `throw new Error()` → Track überspringen oder `notFound()` verwenden
- **Commit:** `fix: add graceful fallbacks for missing audio_url`
- **Begründung:** Verhindert Page-Crashes

**Step 3.3: Dokumentiere Upload-Preview Exceptions**
- **Dateien:** `artist/profile/BannerUpload.tsx`, `artist/releases/[id]/ReleaseCoverUploader.tsx`
- **Aktion:** Kommentar hinzufügen dass `getPublicUrl()` hier erlaubt ist (Upload-Preview)
- **Commit:** `docs: document upload-preview exception for getPublicUrl()`
- **Begründung:** Klarheit für zukünftige Entwickler

### Phase 4: Low Priority (Cleanup)

**Step 4.1: Entscheidung über `/api/storage/public-url`**
- **Datei:** `src/app/api/storage/public-url/route.ts`
- **Aktion:** Entweder entfernen (wenn nicht benötigt) oder dokumentieren warum nötig
- **Commit:** `refactor: remove or document storage public-url API route`
- **Begründung:** Reduziert Code-Duplikation

**Step 4.2: Topbar Profile-Daten serverseitig laden**
- **Datei:** `src/app/dashboard/components/Topbar.tsx`
- **Aktion:** Profile-Daten als Props übergeben statt Client-Query
- **Commit:** `perf: pass profile data to Topbar as props`
- **Begründung:** Reduziert Client-Queries

---

## Section F: Open Questions / Unclear

1. **Warum existiert `/api/storage/public-url`?** Wird nur in `PlaylistAddTrackModal` verwendet. Sollte diese Route bleiben oder können wir sie entfernen?

2. **Sollte `getReleaseQueue.ts` (Client) komplett entfernt werden?** Es gibt bereits `getReleaseQueue.server.ts` und API-Route `/api/releases/[id]/queue`. Wird die Client-Version noch verwendet?

3. **Cache-Busting Strategie:** Sollten wir `updated_at` immer verwenden oder gibt es Fälle wo `Date.now()` gewollt ist? Aktuell ist es inkonsistent.

4. **Error-Boundaries:** Sollten wir React Error Boundaries hinzufügen für bessere Error-Handling? Aktuell werden viele Errors nur geloggt.

5. **Topbar Refresh:** Topbar lädt Profile bei jedem Mount neu. Sollte es ein Caching-Mechanismus geben oder sollten Profile-Daten immer serverseitig geladen werden?

---

**Ende des Audit-Reports**

