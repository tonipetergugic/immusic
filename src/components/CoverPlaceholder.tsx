import { ImageIcon } from "lucide-react";

export default function CoverPlaceholder({
  size = 56,
}: {
  size?: number;
}) {
  return (
    <div
      className="shrink-0 rounded-md border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-black/20 flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <ImageIcon className="h-5 w-5 text-white/40" />
    </div>
  );
}

