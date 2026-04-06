"use client";

import type {
  AcceptedCollab,
  CollabResult,
  CollaborationRole,
  PendingInvite,
} from "./types";

import AppSelect from "@/components/AppSelect";

const COLLAB_ROLE_ITEMS = [
  { value: "CO_OWNER", label: "Co-owner" },
  { value: "FEATURED", label: "Featured" },
] as const;

type CollaborationSectionProps = {
  isLocked: boolean;
  collabQuery: string;
  onCollabQueryChange: (value: string) => void;
  collabRole: CollaborationRole;
  onCollabRoleChange: (role: CollaborationRole) => void;
  collabLoading: boolean;
  onSearch: () => void;
  onRefresh: () => void;
  collabError: string | null;
  collabSuccess: string | null;
  collabResults: CollabResult[];
  onInvite: (profile: CollabResult) => void | Promise<void>;
  pendingInvites: PendingInvite[];
  acceptedCollabs: AcceptedCollab[];
};

export default function CollaborationSection({
  isLocked,
  collabQuery,
  onCollabQueryChange,
  collabRole,
  onCollabRoleChange,
  collabLoading,
  onSearch,
  onRefresh,
  collabError,
  collabSuccess,
  collabResults,
  onInvite,
  pendingInvites,
  acceptedCollabs,
}: CollaborationSectionProps) {
  return (
    <section className="border-b border-white/10 pb-12">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#B3B3B3]">
          Collaboration
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Invite collaborators
        </div>
        <div className="mt-3 text-[15px] leading-7 text-[#B3B3B3]">
          Invite co-owners or featured artists for this track.
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLocked}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 text-sm font-semibold text-white/80 transition hover:border-[#00FFC6]/40 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh invites
        </button>
      </div>

      <div className="mt-8 space-y-8">
        <div className="space-y-4 border-b border-white/10 pb-8">
          <div className="flex flex-col gap-3">
            <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
              Search artist
            </label>
            <input
              type="text"
              value={collabQuery}
              disabled={isLocked}
              onChange={(e) => onCollabQueryChange(e.target.value)}
              className="w-full border-0 border-b border-white/12 bg-transparent px-0 pb-4 pt-1 text-[22px] leading-tight text-white outline-none transition focus:border-[#00FFC6] disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search artist by name…"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <AppSelect
              value={collabRole}
              onChange={(value) => onCollabRoleChange(value as CollaborationRole)}
              items={COLLAB_ROLE_ITEMS as unknown as { value: string; label: string }[]}
              disabled={isLocked}
              className="min-w-0"
            />

            <button
              type="button"
              className="h-[52px] rounded-xl border border-white/10 bg-transparent px-5 text-sm font-semibold text-white/80 transition cursor-pointer hover:border-[#00FFC6]/40 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLocked || collabLoading || collabQuery.trim().length < 2}
              onClick={onSearch}
            >
              {collabLoading ? "Searching..." : "Search"}
            </button>
          </div>

          {collabError ? <div className="text-sm text-red-400">{collabError}</div> : null}
          {collabSuccess ? (
            <div className="text-sm text-emerald-300">{collabSuccess}</div>
          ) : null}

          {collabResults.length > 0 ? (
            <div className="border-b border-white/10">
              {collabResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={isLocked}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 border-t border-white/10 px-0 py-4 text-left text-white/85 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => onInvite(p)}
                >
                  <span className="truncate text-base">{p.display_name}</span>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                    Invite
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-8">
          <div>
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
              Pending invites
            </div>

            {pendingInvites.length === 0 ? (
              <div className="border-b border-white/10 pb-4 text-sm text-white/45">
                None
              </div>
            ) : (
              <div className="border-b border-white/10">
                {pendingInvites.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-3 border-t border-white/10 px-0 py-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-white/85">
                        {i.invitee_display_name ?? "Unknown"}
                      </div>
                      <div className="mt-1 text-xs text-white/50">{i.role}</div>
                    </div>
                    <div className="shrink-0 text-xs text-white/40">
                      {new Date(i.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
              Accepted collaborators
            </div>

            {acceptedCollabs.length === 0 ? (
              <div className="border-b border-white/10 pb-4 text-sm text-white/45">
                None
              </div>
            ) : (
              <div className="border-b border-white/10">
                {acceptedCollabs.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 border-t border-white/10 px-0 py-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-white/85">
                        {c.display_name ?? "Unknown"}
                      </div>
                      <div className="mt-1 text-xs text-white/50">{c.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
