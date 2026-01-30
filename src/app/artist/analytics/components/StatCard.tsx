"use client";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  helper?: string;
};

export default function StatCard({ label, value, delta, helper }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-[#B3B3B3]">
            {label}
          </p>
          <p className="text-2xl md:text-3xl font-semibold">{value}</p>
          {helper ? (
            <p className="text-sm text-[#B3B3B3]">{helper}</p>
          ) : null}
        </div>

        {/* delta badge removed (not used / no real trend data yet) */}
      </div>
    </div>
  );
}

