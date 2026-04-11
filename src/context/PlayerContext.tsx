"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from "react";
import { PlayerTrack } from "@/types/playerTrack";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// PLAYER STATE ░░░░░░░░░░░░░░░░░░░░░░░░░░░░
type PlayerContextType = {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  hideExplicitTracks: boolean;
  isTrackPlaybackBlocked: (track: PlayerTrack | null) => boolean;

  playTrack: (
    track: PlayerTrack,
    options?: { queue?: PlayerTrack[]; startIndex?: number }
  ) => void;
  playQueue: (tracks: PlayerTrack[], startIndex: number) => void;
  togglePlay: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  playNext: () => void;
  playPrev: () => void;
  queue: PlayerTrack[];
  currentIndex: number;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// PROVIDER ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
export function PlayerProvider({
  children,
  initialHideExplicitTracks = false,
}: {
  children: ReactNode;
  initialHideExplicitTracks?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listeningChunkSecondsRef = useRef(0);
  const listeningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seekBreakRef = useRef(false);
  const lastTrackIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sourceQueueRef = useRef<PlayerTrack[]>([]);
  const queueRef = useRef<PlayerTrack[]>([]);
  const currentIndexRef = useRef<number>(0);
  const isShuffleRef = useRef(false);
  const playTrackRef = useRef<
    ((track: PlayerTrack, options?: { queue?: PlayerTrack[]; startIndex?: number }) => void) | null
  >(null);
  const findPlayableIndexRef = useRef<
    ((tracks: PlayerTrack[], startIndex: number, direction: 1 | -1) => number | null) | null
  >(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const getCountryCodeISO2 = (): string => {
    if (typeof navigator === "undefined") return "ZZ";
    const lang = navigator.language || "";
    const match = lang.match(/-([A-Za-z]{2})$/);
    if (!match) return "ZZ";
    return match[1].toUpperCase();
  };

  const getCountryCodeFromCookie = (): string | null => {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(/(?:^|;\s*)immusic_cc=([^;]+)/);
    if (!m) return null;
    const v = decodeURIComponent(m[1] || "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(v)) return v;
    return null;
  };

  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [hideExplicitTracks, setHideExplicitTracks] = useState(initialHideExplicitTracks);

  const isExplicitPlaybackBlocked = useCallback(
    async (track: PlayerTrack | null) => {
      if (!track?.is_explicit) return false;
      return hideExplicitTracks;
    },
    [hideExplicitTracks]
  );

  const isTrackPlaybackBlocked = useCallback(
    (track: PlayerTrack | null) => {
      return !!hideExplicitTracks && !!track?.is_explicit;
    },
    [hideExplicitTracks]
  );

  const findPlayableIndex = useCallback(
    (tracks: PlayerTrack[], startIndex: number, direction: 1 | -1) => {
      if (tracks.length === 0) return null;

      for (let step = 0; step < tracks.length; step += 1) {
        const index =
          (startIndex + direction * step + tracks.length) % tracks.length;
        const candidate = tracks[index] ?? null;

        if (!isTrackPlaybackBlocked(candidate)) {
          return index;
        }
      }

      return null;
    },
    [isTrackPlaybackBlocked]
  );

  useEffect(() => {
    function handleExplicitPreferenceChanged(event: Event) {
      const customEvent = event as CustomEvent<{ hideExplicitTracks?: boolean }>;
      setHideExplicitTracks(!!customEvent.detail?.hideExplicitTracks);
    }

    window.addEventListener(
      "immusic:explicit-playback-preference-changed",
      handleExplicitPreferenceChanged as EventListener
    );

    return () => {
      window.removeEventListener(
        "immusic:explicit-playback-preference-changed",
        handleExplicitPreferenceChanged as EventListener
      );
    };
  }, []);

  useEffect(() => {
    setHideExplicitTracks(initialHideExplicitTracks);
  }, [initialHideExplicitTracks]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  const syncQueueState = useCallback((nextQueue: PlayerTrack[], nextIndex: number) => {
    queueRef.current = nextQueue;
    currentIndexRef.current = nextIndex;
    setQueue(nextQueue);
    setCurrentIndex(nextIndex);
  }, []);

  const shuffleTracks = useCallback((tracks: PlayerTrack[]) => {
    const shuffled = [...tracks];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, []);

  const createActiveQueue = useCallback(
    (tracks: PlayerTrack[], currentTrackId: string, shuffleEnabled: boolean) => {
      if (!shuffleEnabled || tracks.length <= 1) {
        return [...tracks];
      }

      const current = tracks.find((item) => item.id === currentTrackId);
      if (!current) {
        return [...tracks];
      }

      const remaining = shuffleTracks(
        tracks.filter((item) => item.id !== currentTrackId)
      );

      return [current, ...remaining];
    },
    [shuffleTracks]
  );

  const createReshuffledQueue = useCallback(
    (tracks: PlayerTrack[], previousTrackId: string | null) => {
      if (tracks.length <= 1) {
        return [...tracks];
      }

      const reshuffled = shuffleTracks(tracks);

      if (previousTrackId && reshuffled[0]?.id === previousTrackId) {
        const swapIndex = reshuffled.findIndex(
          (item) => item.id !== previousTrackId
        );

        if (swapIndex > 0) {
          [reshuffled[0], reshuffled[swapIndex]] = [
            reshuffled[swapIndex],
            reshuffled[0],
          ];
        }
      }

      return reshuffled;
    },
    [shuffleTracks]
  );

  // INIT AUDIO ONLY ON CLIENT
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;

    audio.ontimeupdate = () => setProgress(audio.currentTime);
    audio.onloadedmetadata = () => setDuration(audio.duration || 0);
    audio.onended = () => {
      setIsPlaying(false);

      const activeQueue = queueRef.current;
      if (!activeQueue || activeQueue.length === 0) return;

      const idx = currentIndexRef.current;
      const currentQueueTrack = activeQueue[idx] ?? null;
      const sourceQueue = sourceQueueRef.current.length
        ? sourceQueueRef.current
        : activeQueue;

      if (isShuffleRef.current && activeQueue.length > 1 && idx >= activeQueue.length - 1) {
        const reshuffledQueue = createReshuffledQueue(
          sourceQueue,
          currentQueueTrack?.id ?? null
        );
        const playableIndex =
          findPlayableIndexRef.current?.(reshuffledQueue, 0, 1) ?? null;

        if (playableIndex === null) return;

        const nextTrack = reshuffledQueue[playableIndex];

        if (!nextTrack) return;

        syncQueueState(reshuffledQueue, playableIndex);
        playTrackRef.current?.(nextTrack, { queue: sourceQueue });
        return;
      }

      const nextIndex = idx < activeQueue.length - 1 ? idx + 1 : 0;
      const playableIndex =
        findPlayableIndexRef.current?.(activeQueue, nextIndex, 1) ?? null;

      if (playableIndex === null) return;

      const nextTrack = activeQueue[playableIndex];

      if (!nextTrack) return;

      playTrackRef.current?.(nextTrack, { queue: sourceQueue });
    };

    return () => {
      // Important for Fast Refresh: always clear handlers
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      audio.onended = null;
    };
  }, []);

  // PLAY TRACK
  const playTrack = useCallback(
    async (track: PlayerTrack, options?: { queue?: PlayerTrack[]; startIndex?: number }) => {
      if (!audioRef.current) return;
      if (!track?.audio_url) return;
      if (await isExplicitPlaybackBlocked(track)) return;

      const audio = audioRef.current;
      const isNewTrack = !currentTrack || currentTrack.id !== track.id;

      let activeQueue: PlayerTrack[] = [track];
      let nextIndex = 0;

      if (options?.queue && options.queue.length) {
        sourceQueueRef.current = [...options.queue];

        if (options.startIndex !== undefined) {
          if (isShuffle) {
            activeQueue = createActiveQueue(sourceQueueRef.current, track.id, true);
            nextIndex = 0;
          } else {
            activeQueue = [...sourceQueueRef.current];
            const foundIndex = activeQueue.findIndex((item) => item.id === track.id);
            nextIndex =
              foundIndex >= 0
                ? foundIndex
                : Math.min(Math.max(options.startIndex, 0), activeQueue.length - 1);
          }
        } else {
          const existingActiveQueue = queueRef.current;
          const existingIndex = existingActiveQueue.findIndex(
            (item) => item.id === track.id
          );

          if (existingActiveQueue.length > 0 && existingIndex >= 0) {
            activeQueue = existingActiveQueue;
            nextIndex = existingIndex;
          } else if (isShuffleRef.current) {
            activeQueue = createActiveQueue(sourceQueueRef.current, track.id, true);
            nextIndex = 0;
          } else {
            activeQueue = [...sourceQueueRef.current];
            const foundIndex = activeQueue.findIndex((item) => item.id === track.id);
            nextIndex = foundIndex >= 0 ? foundIndex : 0;
          }
        }
      } else {
        sourceQueueRef.current = [track];
      }

      syncQueueState(activeQueue, nextIndex);

      setCurrentTrack((prev) => {
        if (prev && prev.id === track.id) {
          return { ...prev, ...track };
        }
        return track;
      });

      if (isNewTrack) {
        audio.src = track.audio_url;
        audio.currentTime = 0;
        sessionIdRef.current = crypto.randomUUID();

        audio.load();

        await new Promise((resolve) => {
          const onLoaded = () => {
            audio.removeEventListener("loadedmetadata", onLoaded);
            resolve(true);
          };
          audio.addEventListener("loadedmetadata", onLoaded);
        });
      }

      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Audio play error:", err);
      }
    },
    [createActiveQueue, currentTrack, isExplicitPlaybackBlocked, isShuffle, syncQueueState]
  );

  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  useEffect(() => {
    findPlayableIndexRef.current = findPlayableIndex;
  }, [findPlayableIndex]);

  // TOGGLE PLAY
  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (await isExplicitPlaybackBlocked(currentTrack)) return;

      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Resume error:", err));
    }
  }, [currentTrack, isExplicitPlaybackBlocked, isPlaying]);

  // PAUSE
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // SEEK
  const seek = useCallback(
    (seconds: number) => {
      if (!audioRef.current) return;
      const audio = audioRef.current;

      audio.currentTime = Math.min(Math.max(seconds, 0), duration);
      setProgress(audio.currentTime);
      seekBreakRef.current = true;
      listeningChunkSecondsRef.current = 0;
    },
    [duration]
  );

  // VOLUME
  const setVolume = useCallback((v: number) => {
    const value = Math.min(Math.max(v, 0), 1);
    setVolumeState(value);

    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  }, []);

  const playQueue = useCallback(
    (tracks: PlayerTrack[], startIndex: number) => {
      if (!tracks || tracks.length === 0) return;

      const safeIndex = Math.min(Math.max(startIndex, 0), tracks.length - 1);
      const playableIndex = findPlayableIndex(tracks, safeIndex, 1);

      if (playableIndex === null) return;

      playTrack(tracks[playableIndex], {
        queue: tracks,
        startIndex: playableIndex,
      });
    },
    [findPlayableIndex, playTrack]
  );

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const nextIsShuffle = !prev;
      const baseQueue = sourceQueueRef.current.length
        ? sourceQueueRef.current
        : queueRef.current;

      if (currentTrack && baseQueue.length > 0) {
        const nextQueue = createActiveQueue(baseQueue, currentTrack.id, nextIsShuffle);
        const nextIndex = nextQueue.findIndex((item) => item.id === currentTrack.id);
        syncQueueState(nextQueue, nextIndex >= 0 ? nextIndex : 0);
      }

      return nextIsShuffle;
    });
  }, [createActiveQueue, currentTrack, syncQueueState]);

  const playNext = useCallback(() => {
    const activeQueue = queueRef.current;
    if (activeQueue.length === 0) return;

    const idx = currentIndexRef.current;
    const currentQueueTrack = activeQueue[idx] ?? null;
    const sourceQueue = sourceQueueRef.current.length
      ? sourceQueueRef.current
      : activeQueue;

    if (isShuffleRef.current && activeQueue.length > 1 && idx >= activeQueue.length - 1) {
      const reshuffledQueue = createReshuffledQueue(
        sourceQueue,
        currentQueueTrack?.id ?? null
      );
      const playableIndex = findPlayableIndex(reshuffledQueue, 0, 1);

      if (playableIndex === null) return;

      const nextTrack = reshuffledQueue[playableIndex];

      if (!nextTrack) return;

      syncQueueState(reshuffledQueue, playableIndex);
      playTrack(nextTrack, { queue: sourceQueue });
      return;
    }

    const nextIndex = idx < activeQueue.length - 1 ? idx + 1 : 0;
    const playableIndex = findPlayableIndex(activeQueue, nextIndex, 1);

    if (playableIndex === null) return;

    const nextTrack = activeQueue[playableIndex];

    if (!nextTrack) return;

    playTrack(nextTrack, { queue: sourceQueue });
  }, [createReshuffledQueue, findPlayableIndex, playTrack, syncQueueState]);

  const playPrev = useCallback(() => {
    const activeQueue = queueRef.current;
    if (activeQueue.length === 0) return;

    const idx = currentIndexRef.current;
    const prevIndex = idx > 0 ? idx - 1 : activeQueue.length - 1;

    const playableIndex = findPlayableIndex(activeQueue, prevIndex, -1);

    if (playableIndex === null) return;

    const prevTrack = activeQueue[playableIndex];

    if (!prevTrack) return;

    const sourceQueue = sourceQueueRef.current.length
      ? sourceQueueRef.current
      : activeQueue;

    playTrack(prevTrack, { queue: sourceQueue });
  }, [findPlayableIndex, playTrack]);

  useEffect(() => {
    if (listeningTimerRef.current) {
      clearInterval(listeningTimerRef.current);
      listeningTimerRef.current = null;
    }

    if (!currentTrack || !isPlaying) {
      listeningChunkSecondsRef.current = 0;
      return;
    }

    if (lastTrackIdRef.current !== currentTrack.id) {
      listeningChunkSecondsRef.current = 0;
      seekBreakRef.current = false;
      lastTrackIdRef.current = currentTrack.id;
    }

    listeningTimerRef.current = setInterval(() => {
      if (!currentTrack) return;

      if (seekBreakRef.current) {
        listeningChunkSecondsRef.current = 0;
        seekBreakRef.current = false;
        return;
      }

      listeningChunkSecondsRef.current += 1;

      if (listeningChunkSecondsRef.current >= 5) {
        if (!sessionIdRef.current) {
          sessionIdRef.current = crypto.randomUUID();
        }
        const countryCode = getCountryCodeFromCookie() ?? getCountryCodeISO2();
        (async () => {
          const { data, error } = await supabase.rpc("rpc_track_listen_ping", {
            p_track_id: currentTrack.id,
            p_session_id: sessionIdRef.current,
            p_delta_seconds: 5,
            p_country_code: String(countryCode ?? "ZZ").trim().toUpperCase().slice(0, 2),
          });

          if (error) {
            console.error("listen ping error", error);
            return;
          }
        })();

        listeningChunkSecondsRef.current = 0;
      }
    }, 1000);

    return () => {
      if (listeningTimerRef.current) {
        clearInterval(listeningTimerRef.current);
        listeningTimerRef.current = null;
      }
    };
  }, [currentTrack, isPlaying, supabase]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        duration,
        volume,
        isShuffle,
        hideExplicitTracks,
        isTrackPlaybackBlocked,
        playTrack,
        togglePlay,
        pause,
        seek,
        setVolume,
        toggleShuffle,
        playQueue,
        playNext,
        playPrev,
        queue,
        currentIndex,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used inside PlayerProvider");
  }
  return ctx;
}
