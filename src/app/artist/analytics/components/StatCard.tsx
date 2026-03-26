"use client";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  helper?: string;
};

export default function StatCard(props: StatCardProps) {
  const { label, value, helper } = props;
  return (
    <div className="px-2 py-1 md:px-3 md:py-2">
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

