"use client";

export default function AddTrackButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg bg-[#00FFC6] hover:bg-[#00E0B0] text-black font-semibold transition"
    >
      Add Track
    </button>
  );
}
