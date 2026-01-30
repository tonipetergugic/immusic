"use client";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  kind: "line" | "bars";
  value?: string;
  valueHelper?: string;
  onOpenDetails?: (title: string, subtitle?: string) => void;
};

function FakeLine() {
  const points = [
    { x: "8%", y: "70%" },
    { x: "22%", y: "52%" },
    { x: "38%", y: "62%" },
    { x: "55%", y: "40%" },
    { x: "72%", y: "58%" },
    { x: "88%", y: "30%" },
  ];

  return (
    <div className="h-44 rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-3">
      <div className="h-full w-full relative overflow-hidden rounded-lg">
        {/* grid */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 flex flex-col justify-between py-2 opacity-60">
            <div className="h-px bg-white/10" />
            <div className="h-px bg-white/10" />
            <div className="h-px bg-white/10" />
            <div className="h-px bg-white/10" />
          </div>
          <div className="absolute inset-0 flex justify-between px-2 opacity-40">
            <div className="w-px bg-white/10" />
            <div className="w-px bg-white/10" />
            <div className="w-px bg-white/10" />
            <div className="w-px bg-white/10" />
            <div className="w-px bg-white/10" />
          </div>
        </div>

        {/* line glow */}
        <div className="absolute left-0 right-0 bottom-0 top-0">
          <div className="absolute inset-0 bg-[#00FFC6]/5 blur-2xl" />
        </div>

        {/* dots */}
        {points.map((p, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-[#00FFC6]"
            style={{ left: p.x, bottom: p.y }}
          />
        ))}

        {/* baseline */}
        <div className="absolute left-3 right-3 bottom-6 h-[2px] bg-[#00FFC6]/25" />
      </div>
    </div>
  );
}

function FakeBars() {
  const bars = [32, 64, 45, 78, 38, 55, 70, 42, 84, 58];

  return (
    <div className="h-44 rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-3">
      <div className="h-full w-full relative overflow-hidden rounded-lg">
        {/* grid */}
        <div className="absolute inset-0 flex flex-col justify-between py-2 opacity-60">
          <div className="h-px bg-white/10" />
          <div className="h-px bg-white/10" />
          <div className="h-px bg-white/10" />
          <div className="h-px bg-white/10" />
        </div>

        <div className="absolute inset-0 flex items-end gap-2 px-2 pb-2">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-lg bg-white/10 relative overflow-hidden"
              style={{ height: `${h}%` }}
            >
              <div className="absolute inset-0 bg-[#00FFC6]/20" />
              <div className="absolute top-0 left-0 right-0 h-6 bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChartCard({
  title,
  subtitle,
  kind,
  value,
  valueHelper,
  onOpenDetails,
}: ChartCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 ${
        onOpenDetails ? "cursor-pointer hover:bg-white/10" : ""
      }`}
      role={onOpenDetails ? "button" : undefined}
      tabIndex={onOpenDetails ? 0 : undefined}
      onClick={() => onOpenDetails?.(title, subtitle)}
      onKeyDown={(e) => {
        if (!onOpenDetails) return;
        if (e.key === "Enter" || e.key === " ") onOpenDetails(title, subtitle);
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {subtitle ? (
            <p className="text-xs text-[#B3B3B3] mt-1">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          {value ? (
            <div className="text-right">
              <div className="text-2xl font-semibold text-white leading-none">{value}</div>
              {valueHelper ? (
                <div className="text-xs text-[#B3B3B3] mt-1">{valueHelper}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {kind === "line" ? <FakeLine /> : <FakeBars />}

      <div className="mt-3 flex items-center justify-between text-xs text-[#B3B3B3]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails?.(title, subtitle);
          }}
          className="text-[#00FFC6] hover:opacity-90"
        >
          Details →
        </button>
      </div>
    </div>
  );
}

