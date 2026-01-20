"use client";

export default function PlaylistSettingsMenu({
  playlist,
  onTogglePublic,
  onEditDetails,
  onDeletePlaylist,
}: {
  playlist: any;
  onTogglePublic: () => void | Promise<void>;
  onEditDetails: () => void;
  onDeletePlaylist: () => void;
}) {
  const menuItems = [
    {
      label: playlist.is_public ? "Make Private" : "Make Public",
      onClick: onTogglePublic,
    },
    {
      label: "Edit Details",
      onClick: onEditDetails,
    },
    {
      label: "Delete Playlist",
      onClick: onDeletePlaylist,
      danger: true,
    },
  ];

  return (
    <div
      className="
        w-56
        rounded-2xl
        border border-white/10
        bg-white/[0.03]
        backdrop-blur-sm
        shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.55)]
        p-2
      "
    >
      {menuItems.map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          className={`
            w-full text-left px-3 py-2.5 text-sm
            rounded-xl
            transition
            ${item.danger
              ? "text-red-300/90 hover:bg-white/[0.06] hover:border-red-400/40"
              : "text-white/80 hover:bg-white/[0.06] hover:text-white"
            }
            border border-transparent
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60
          `}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
