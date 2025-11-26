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
        w-48 
        bg-neutral-900 border border-neutral-800 
        rounded-lg shadow-xl p-2
      "
    >
      {menuItems.map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          className={`
            w-full text-left px-3 py-2 text-sm 
            rounded-md 
            transition
            ${item.danger
              ? "text-red-500 hover:bg-red-500/20"
              : "text-white/80 hover:bg-neutral-800/60"
            }
          `}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
