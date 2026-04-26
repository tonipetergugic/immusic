export type AnalysisPayload = Record<string, unknown>;

export type StatusBlock = {
  label?: string;
  text?: string;
};

export type ReleaseReadiness = {
  state?: string;
  label?: string;
  text?: string;
};

export type CriticalWarning = {
  title?: string;
  text?: string;
  severity?: string;
  area?: string;
};

export type TechnicalReleaseCheck = {
  area?: string;
  label?: string;
  state?: string;
  short_text?: string;
};

export type NextStep = {
  title?: string;
  text?: string;
  button_label?: string;
  action_type?: string;
};

export type OptionalFeedback = {
  available?: boolean;
  locked?: boolean;
  label?: string;
  text?: string;
};

export type KeyStrength = {
  title?: string;
  text?: string;
  area?: string;
};

export type ThingToCheck = {
  title?: string;
  text?: string;
  severity?: string;
  area?: string;
};

export type ArtistDecisionPayload = {
  track: {
    title: string;
    artist_name: string | null;
    version: string | null;
    duration_sec: number | null;
    declared_bpm: number | null;
    declared_key: string | null;
    main_genre: string | null;
    subgenre: string | null;
    artwork_url: string | null;
  } & {
    bpm?: number;
    key?: string | null;
    duration_sec?: number;
  };
  track_status?: StatusBlock;
  release_readiness?: ReleaseReadiness;
  critical_warnings?: CriticalWarning[];
  technical_release_checks?: TechnicalReleaseCheck[];
  key_strengths?: KeyStrength[];
  things_to_check?: ThingToCheck[];
  next_step?: NextStep;
  optional_feedback?: OptionalFeedback;
  meta: {
    warnings: string[];
    source: string;
    created_at: string | null;
  };
};
