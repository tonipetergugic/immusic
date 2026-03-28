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
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
      <div>
        <div className="text-[1.125rem] font-semibold uppercase tracking-[0.12em] text-[#00FFC6]">
          Collaboration
        </div>
        <div className="mt-1 text-sm text-white/45">
          Invite co-owners or featured artists for this track.
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] hover:border-[#00FFC6]/40"
        >
          Refresh invites
        </button>
      </div>

      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-1 gap-3">
          <input
            type="text"
            value={collabQuery}
            onChange={(e) => onCollabQueryChange(e.target.value)}
            className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-base text-white outline-none transition cursor-pointer focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
            placeholder="Search artist by name…"
          />

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <AppSelect
              value={collabRole}
              onChange={(value) => onCollabRoleChange(value as CollaborationRole)}
              items={COLLAB_ROLE_ITEMS as unknown as { value: string; label: string }[]}
              className="min-w-0"
            />

            <button
              type="button"
              className="h-[52px] rounded-xl border border-white/10 bg-transparent px-4 text-sm font-semibold text-white/80 transition cursor-pointer hover:bg-white/[0.06] hover:border-[#00FFC6]/40 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={collabLoading || collabQuery.trim().length < 2}
              onClick={onSearch}
            >
              {collabLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {collabError && <div className="text-sm text-red-400">{collabError}</div>}
        {collabSuccess && (
          <div className="text-sm text-emerald-300">{collabSuccess}</div>
        )}

        {collabResults.length > 0 && (
          <div className="divide-y divide-white/10 rounded-xl border border-white/10">
            {collabResults.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-white/85 hover:bg-white/[0.04]"
                onClick={() => onInvite(p)}
              >
                <span className="truncate">{p.display_name}</span>
                <span className="text-xs text-white/50">Invite</span>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.12em] text-white/60">
              Pending invites
            </div>
            {pendingInvites.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-white/50">
                None
              </div>
            ) : (
              <div className="divide-y divide-white/10 rounded-xl border border-white/10">
                {pendingInvites.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-white/85">
                        {i.invitee_display_name ?? "Unknown"}
                      </div>
                      <div className="text-xs text-white/50">{i.role}</div>
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
            <div className="mb-3 text-xs uppercase tracking-[0.12em] text-white/60">
              Accepted collaborators
            </div>
            {acceptedCollabs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-white/50">
                None
              </div>
            ) : (
              <div className="divide-y divide-white/10 rounded-xl border border-white/10">
                {acceptedCollabs.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
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
    </section>
  );
}
