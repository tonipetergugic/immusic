export function DecisionCenterEmptyState() {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5">
      <div className="text-sm font-medium text-white/85">
        No tracks available yet
      </div>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Upload and approve a track first before using the Decision Center.
      </p>
    </div>
  );
}
