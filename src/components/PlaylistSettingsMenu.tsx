"use client";

export default function PlaylistSettingsMenu({
  playlist,
  onAddTrack,
  onTogglePublic,
}: {
  playlist: any;
  onAddTrack: () => void;
  onTogglePublic: () => void | Promise<void>;
}) {
  const menuItems = [
    {
      label: "Add Track",
      onClick: onAddTrack,
    },
    {
      label: playlist.is_public ? "Make Private" : "Make Public",
      onClick: onTogglePublic,
    },
  ];

  return (
    <div
      className="
        absolute left-0 mt-2 z-50 w-48 
        bg-neutral-900 border border-neutral-800 
        rounded-lg shadow-xl p-2
      "
    >
      {menuItems.map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          className="
            w-full text-left px-3 py-2 text-sm 
            text-white/80 rounded-md 
            hover:bg-neutral-800/60 
            transition
          "
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
