"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteTrackCollaboratorAction,
  renameTrackAction,
  type RenameTrackPayload,
} from "../../actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BackLink from "@/components/BackLink";

type Track = {
  id: string;
  title: string;
  version: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  has_lyrics: boolean;
  is_explicit: boolean;
  artist_id: string;
};

const TRACK_VERSION_OPTIONS = [
  { value: "ORIGINAL", label: "Original Mix" },
  { value: "EXTENDED", label: "Extended Mix" },
  { value: "RADIO", label: "Radio Edit" },
  { value: "CLUB", label: "Club Mix" },
  { value: "INSTRUMENTAL", label: "Instrumental Mix" },
  { value: "DUB", label: "Dub Mix" },
  { value: "VIP", label: "VIP Mix" },
  { value: "SPECIAL", label: "Special Mix" },
] as const;

const TRACK_VERSION_VALUES = new Set(TRACK_VERSION_OPTIONS.map((o) => o.value));

// BPM quick suggestions (UI only)
const BPM_SUGGESTIONS = [
  60, 70, 80, 90, 100, 110,
  120, 124, 126, 128, 130, 132, 134, 136, 138, 140, 142, 145, 150, 160, 174
] as const;

export default function EditTrackClient({ track }: { track: Track }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const ALLOWED_KEYS = useMemo(
    () =>
      new Set([
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B",
        "Cm",
        "C#m",
        "Dm",
        "D#m",
        "Em",
        "Fm",
        "F#m",
        "Gm",
        "G#m",
        "Am",
        "A#m",
        "Bm",
      ]),
    []
  );

  const KEY_SUGGESTIONS = useMemo(() => {
    return Array.from(ALLOWED_KEYS).sort((a, b) => a.localeCompare(b));
  }, [ALLOWED_KEYS]);

  const [isPending, startTransition] = useTransition();

  // Form
  const [newTitle, setNewTitle] = useState(track.title);
  const [newBpm, setNewBpm] = useState<string>(track.bpm ? String(track.bpm) : "");
  const [newKey, setNewKey] = useState<string>(track.key ?? "");
  const [newGenre, setNewGenre] = useState<string>(track.genre ?? "");
  const [newVersion, setNewVersion] = useState<string>(track.version ?? "");
  const [newHasLyrics, setNewHasLyrics] = useState<boolean>(Boolean(track.has_lyrics));
  const [newIsExplicit, setNewIsExplicit] = useState<boolean>(Boolean(track.is_explicit));
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Collaboration
  const [collabQuery, setCollabQuery] = useState("");
  const [collabRole, setCollabRole] = useState<"CO_OWNER" | "FEATURED">("CO_OWNER");
  const [collabResults, setCollabResults] = useState<
    Array<{ id: string; display_name: string }>
  >([]);
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [collabSuccess, setCollabSuccess] = useState<string | null>(null);

  const [pendingInvites, setPendingInvites] = useState<
    Array<{
      id: string;
      role: "CO_OWNER" | "FEATURED";
      invitee_display_name: string | null;
      created_at: string;
    }>
  >([]);

  const [acceptedCollabs, setAcceptedCollabs] = useState<
    Array<{ id: string; role: "CO_OWNER" | "FEATURED"; display_name: string | null }>
  >([]);

  const [collabListLoading, setCollabListLoading] = useState(false);

  const loadCollabLists = async () => {
    setCollabListLoading(true);
    setCollabError(null);

    try {
      const [invRes, accRes] = await Promise.all([
        supabase
          .from("track_collaboration_invites")
          .select("id,role,invitee_display_name,created_at")
          .eq("track_id", track.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("track_collaborators")
          .select("id,role,profiles:profile_id(display_name)")
          .eq("track_id", track.id)
          .in("role", ["CO_OWNER", "FEATURED"]),
      ]);

      if (invRes.error) {
        setPendingInvites([]);
        setAcceptedCollabs([]);
        setCollabError(invRes.error.message ?? "Failed to load collaboration invites.");
        return;
      }

      if (accRes.error) {
        setPendingInvites([]);
        setAcceptedCollabs([]);
        setCollabError(accRes.error.message ?? "Failed to load accepted collaborators.");
        return;
      }

      setPendingInvites(
        (invRes.data ?? []).map((r: any) => ({
          id: r.id,
          role: r.role,
          invitee_display_name: r.invitee_display_name ?? null,
          created_at: r.created_at,
        }))
      );

      setAcceptedCollabs(
        (accRes.data ?? []).map((r: any) => ({
          id: r.id,
          role: r.role,
          display_name: r.profiles?.display_name ?? null,
        }))
      );
    } catch {
      setPendingInvites([]);
      setAcceptedCollabs([]);
      setCollabError("Failed to load collaboration data.");
    } finally {
      setCollabListLoading(false);
    }
  };

  useEffect(() => {
    void loadCollabLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  const runCollabSearch = async () => {
    const q = collabQuery.trim();
    setCollabError(null);
    setCollabSuccess(null);

    if (q.length < 2) {
      setCollabResults([]);
      return;
    }

    setCollabLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name")
        .ilike("display_name", `%${q}%`)
        .limit(8);

      if (error) throw error;

      const filtered = (data ?? []).filter((p) => p.id !== track.artist_id);
      setCollabResults(filtered as any);
    } catch {
      setCollabError("Failed to search artists.");
      setCollabResults([]);
    } finally {
      setCollabLoading(false);
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      setEditSuccess(null);

      const titleValue = newTitle.trim();
      if (titleValue.length === 0) {
        setEditError("Title cannot be empty.");
        return;
      }

      let bpmValue: number | null = null;
      if (newBpm !== "") {
        const parsed = Number.parseInt(newBpm, 10);
        if (Number.isNaN(parsed) || parsed < 40 || parsed > 240) {
          setEditError("BPM must be between 40 and 240.");
          return;
        }
        bpmValue = parsed;
      }

      const trimmedKey = newKey.trim();
      let keyValue: string | null = null;
      if (trimmedKey !== "") {
        if (!ALLOWED_KEYS.has(trimmedKey)) {
          setEditError("Key must be a valid Ableton key (e.g. F#m, Dm).");
          return;
        }
        keyValue = trimmedKey;
      }

      const versionValue = newVersion.trim() === "" ? null : newVersion.toUpperCase();
      if (versionValue !== null && !TRACK_VERSION_VALUES.has(versionValue as any)) {
        setEditError("Version must be a valid preset.");
        return;
      }

      setEditError(null);

      const payload: RenameTrackPayload = {
        title: titleValue,
        bpm: bpmValue,
        key: keyValue,
        genre: newGenre.trim() === "" ? null : newGenre.trim(),
        has_lyrics: newHasLyrics,
        is_explicit: newIsExplicit,
        version: versionValue,
      };

      await renameTrackAction(track.id, payload);

      setEditSuccess("Saved.");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[860px] pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.12em] text-white/60">Track</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white drop-shadow-[0_0_30px_rgba(0,255,198,0.15)]">Edit Track</h1>
          <p className="mt-1 text-sm text-white/60">
            Update metadata used for releases and discovery.
          </p>
        </div>

        <BackLink className="mt-1" />
      </div>

      <datalist id="bpm-suggestions">
        {BPM_SUGGESTIONS.map((bpm) => (
          <option key={bpm} value={bpm} />
        ))}
      </datalist>

      <datalist id="key-suggestions">
        {KEY_SUGGESTIONS.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>

      {/* FORM (flat) */}
      <div className="mt-8 space-y-10">
        {/* Title */}
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.12em] text-white/60">
            Title
          </label>
          <input
            type="text"
            className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={100}
            placeholder="Track title"
          />
        </div>

        {/* BPM + Key */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              BPM
            </label>
            <input
              inputMode="numeric"
              type="text"
              className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={newBpm}
              list="bpm-suggestions"
              maxLength={3}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                // erlaubt: leer, 1–3 Ziffern (Zwischenzustände)
                if (raw.length <= 3) {
                  setNewBpm(raw);
                }
              }}
              onBlur={() => {
                if (newBpm === "") return;

                const n = Number.parseInt(newBpm, 10);
                if (Number.isNaN(n)) {
                  setNewBpm("");
                  return;
                }

                // clamp auf erlaubten Bereich
                const clamped = Math.min(240, Math.max(40, n));
                setNewBpm(String(clamped));
              }}
              placeholder="Typical range: 60–180"
            />
            {newBpm !== "" && (() => {
              const n = Number.parseInt(newBpm, 10);
              if (Number.isNaN(n)) return null;
              if (n < 60 || n > 180) {
                return (
                  <div className="text-xs text-white/50">
                    Unusual BPM (typical range is 60–180).
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              Key
            </label>
            <input
              type="text"
              className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
              value={newKey}
              list="key-suggestions"
              maxLength={3}
              onChange={(e) => {
                const v = e.target.value.replace(/\s+/g, "");
                if (v === "" || ALLOWED_KEYS.has(v)) {
                  setNewKey(v);
                }
              }}
              placeholder="e.g. Dm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Version */}
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              Version
            </label>
            <select
              className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
            >
              <option value="" className="text-white/60">
                None
              </option>

              {TRACK_VERSION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Genre */}
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.12em] text-white/60">
              Genre
            </label>
            <select
              className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
            >
              <option value="">Select genre</option>
              <option value="Trance">Trance</option>
              <option value="Progressive Trance">Progressive Trance</option>
              <option value="Uplifting Trance">Uplifting Trance</option>
              <option value="Tech Trance">Tech Trance</option>
              <option value="Progressive House">Progressive House</option>
              <option value="Techno">Techno</option>
              <option value="Melodic Techno">Melodic Techno</option>
              <option value="House">House</option>
              <option value="EDM">EDM</option>
              <option value="Hardstyle">Hardstyle</option>
              <option value="Drum & Bass">Drum & Bass</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <label className="h-[52px] px-4 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white/90">Contains lyrics</div>
              <div className="mt-0.5 text-xs text-white/60">
                Mark instrumental tracks as off.
              </div>
            </div>
            <input
              type="checkbox"
              checked={newHasLyrics}
              onChange={(e) => setNewHasLyrics(e.target.checked)}
              className="h-5 w-5 accent-[#00FFC6]"
            />
          </label>

          <label className="h-[52px] px-4 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white/90">Explicit content</div>
              <div className="mt-0.5 text-xs text-white/60">
                Enable if the track is explicit.
              </div>
            </div>
            <input
              type="checkbox"
              checked={newIsExplicit}
              onChange={(e) => setNewIsExplicit(e.target.checked)}
              className="h-5 w-5 accent-[#00FFC6]"
            />
          </label>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/10" />

        {/* Collaboration */}
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-white/60">
            Collaboration (optional)
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-center">
            <input
              type="text"
              value={collabQuery}
              onChange={(e) => setCollabQuery(e.target.value)}
              className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
              placeholder="Search artist by name…"
            />

            <select
              className="h-[52px] rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
              value={collabRole}
              onChange={(e) => setCollabRole(e.target.value as any)}
            >
              <option value="CO_OWNER">Co-owner</option>
              <option value="FEATURED">Featured</option>
            </select>

            <button
              type="button"
              className="h-[52px] rounded-xl border border-white/10 bg-transparent px-4 text-base font-semibold text-white/80 transition hover:bg-white/[0.06] hover:border-[#00FFC6]/40 disabled:opacity-50"
              disabled={collabLoading || collabQuery.trim().length < 2}
              onClick={runCollabSearch}
            >
              {collabLoading ? "Searching..." : "Search"}
            </button>
          </div>

          {collabError && <div className="mt-3 text-sm text-red-400">{collabError}</div>}
          {collabSuccess && (
            <div className="mt-3 text-sm text-emerald-300">{collabSuccess}</div>
          )}

          {collabResults.length > 0 && (
            <div className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10">
              {collabResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-white/85 hover:bg-white/[0.04]"
                  onClick={async () => {
                    setCollabError(null);
                    setCollabSuccess(null);

                    try {
                      await inviteTrackCollaboratorAction({
                        trackId: track.id,
                        inviteeProfileId: p.id,
                        role: collabRole,
                      });
                      setCollabSuccess(`Invite sent to ${p.display_name}`);
                      setCollabResults([]);
                      setCollabQuery("");
                      await loadCollabLists();
                    } catch (e: any) {
                      setCollabError(e?.message ?? "Failed to send invite.");
                    }
                  }}
                >
                  <span className="truncate">{p.display_name}</span>
                  <span className="text-xs text-white/50">Invite</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-white/60 mb-3">
                Pending invites
              </div>
              {collabListLoading ? (
                <div className="text-sm text-white/60">Loading…</div>
              ) : pendingInvites.length === 0 ? (
                <div className="text-sm text-white/60">None</div>
              ) : (
                <div className="divide-y divide-white/10 rounded-xl border border-white/10">
                  {pendingInvites.map((i) => (
                    <div key={i.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white/85">
                          {i.invitee_display_name ?? "Unknown"}
                        </div>
                        <div className="text-xs text-white/50">{i.role}</div>
                      </div>
                      <div className="text-xs text-white/40">
                        {new Date(i.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-white/60 mb-3">
                Accepted collaborators
              </div>
              {collabListLoading ? (
                <div className="text-sm text-white/60">Loading…</div>
              ) : acceptedCollabs.length === 0 ? (
                <div className="text-sm text-white/60">None</div>
              ) : (
                <div className="divide-y divide-white/10 rounded-xl border border-white/10">
                  {acceptedCollabs.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-white/85">
                          {c.display_name ?? "Unknown"}
                        </div>
                        <div className="text-xs text-white/50">{c.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-px w-full bg-white/10" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            {editError && <div className="text-sm text-red-400">{editError}</div>}
            {editSuccess && <div className="text-sm text-emerald-300">{editSuccess}</div>}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] hover:border-[#00FFC6]/40"
              onClick={() => router.push("/artist/my-tracks")}
            >
              Done
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.06] hover:border-[#00FFC6]/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
              disabled={isPending}
              onClick={handleSave}
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
