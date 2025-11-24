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
import { Database } from "@/types/supabase";

// TYPE SAFETY ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
export type Track = Database["public"]["Tables"]["tracks"]["Row"];

// PLAYER STATE ░░░░░░░░░░░░░░░░░░░░░░░░░░░░
type PlayerContextType = {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;

  playTrack: (track: Track) => void;
  togglePlay: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  playNext: () => void;
  playPrev: () => void;
  setQueueList: (tracks: Track[], startIndex: number) => void;
  queue: Track[];
  queueIndex: number;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// PROVIDER ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);

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
    async (track: Track) => {
      if (!audioRef.current) return;

      const audio = audioRef.current;

      const isNewTrack = !currentTrack || currentTrack.id !== track.id;

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

  const setQueueList = useCallback(
    (tracks: Track[], startIndex: number) => {
      setQueue(tracks);
      setQueueIndex(startIndex);
      playTrack(tracks[startIndex]);
    },
    [playTrack]
  );

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIndex);
    playTrack(queue[nextIndex]);
  }, [queue, queueIndex, playTrack]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIndex);
    playTrack(queue[prevIndex]);
  }, [queue, queueIndex, playTrack]);

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
        playNext,
        playPrev,
        setQueueList,
        queue,
        queueIndex,
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
