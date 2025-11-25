"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { PlayerTrack } from "@/types/playerTrack";

// PLAYER STATE ░░░░░░░░░░░░░░░░░░░░░░░░░░░░
type PlayerContextType = {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;

  playTrack: (
    track: PlayerTrack,
    options?: { queue?: PlayerTrack[]; startIndex?: number }
  ) => void;
  playQueue: (tracks: PlayerTrack[], startIndex: number) => void;
  togglePlay: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  playNext: () => void;
  playPrev: () => void;
  queue: PlayerTrack[];
  currentIndex: number;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// PROVIDER ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // INIT AUDIO ONLY ON CLIENT
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoaded = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  // PLAY TRACK
  const playTrack = useCallback(
    async (track: PlayerTrack, options?: { queue?: PlayerTrack[]; startIndex?: number }) => {
      if (!audioRef.current) return;
      if (!track?.audio_url) return;

      const audio = audioRef.current;

      const isNewTrack = !currentTrack || currentTrack.id !== track.id;

      if (options?.queue && options.queue.length) {
        setQueue(options.queue);
        const derivedIndex =
          options.startIndex !== undefined
            ? options.startIndex
            : options.queue.findIndex((item) => item.id === track.id);
        setCurrentIndex(derivedIndex >= 0 ? derivedIndex : 0);
      } else {
        setQueue([track]);
        setCurrentIndex(0);
      }

      if (isNewTrack) {
        setCurrentTrack(track);
        audio.src = track.audio_url;
        audio.currentTime = 0;

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
    [currentTrack]
  );

  // TOGGLE PLAY
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Resume error:", err));
    }
  }, [isPlaying]);

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
      playTrack(tracks[safeIndex], { queue: tracks, startIndex: safeIndex });
    },
    [playTrack]
  );

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = currentIndex < queue.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(nextIndex);
    playTrack(queue[nextIndex], { queue, startIndex: nextIndex });
  }, [queue, currentIndex, playTrack]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    setCurrentIndex(prevIndex);
    playTrack(queue[prevIndex], { queue, startIndex: prevIndex });
  }, [queue, currentIndex, playTrack]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        duration,
        volume,
        playTrack,
        togglePlay,
        pause,
        seek,
        setVolume,
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
