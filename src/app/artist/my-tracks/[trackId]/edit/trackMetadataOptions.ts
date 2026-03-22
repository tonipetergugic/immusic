export type TrackVersionOption = {
  value: string;
  label: string;
};

export const TRACK_VERSION_OPTIONS: readonly TrackVersionOption[] = [
  { value: "None", label: "None" },
  { value: "Original Mix", label: "Original Mix" },
  { value: "Extended Mix", label: "Extended Mix" },
  { value: "Radio Edit", label: "Radio Edit" },
  { value: "Club Mix", label: "Club Mix" },
  { value: "Instrumental Mix", label: "Instrumental Mix" },
  { value: "Dub Mix", label: "Dub Mix" },
  { value: "VIP Mix", label: "VIP Mix" },
  { value: "Special Mix", label: "Special Mix" },
] as const;

export const TRACK_VERSION_VALUES = new Set(
  TRACK_VERSION_OPTIONS.map((o) => o.value)
);

export const BPM_SUGGESTIONS = [
  60, 70, 80, 90, 100, 110,
  120, 124, 126, 128, 130, 132, 134, 136, 138, 140, 142, 145, 150, 160, 174,
] as const;
