"use client";

import { useState, useMemo } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

function formatTime(seconds: number): string {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    togglePlay,
    seek,
    setVolume,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [lastVolumeBeforeMute, setLastVolumeBeforeMute] = useState(1);

  const progressPercent = useMemo(() => {
    if (!duration || duration === 0) return 0;
    return Math.min(100, Math.max(0, (progress / duration) * 100));
  }, [progress, duration]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    seek(value);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    if (value === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
      setLastVolumeBeforeMute(value);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      // zurück zum letzten Volume
      setIsMuted(false);
      setVolume(lastVolumeBeforeMute || 1);
    } else {
      setIsMuted(true);
      setLastVolumeBeforeMute(volume || 1);
      setVolume(0);
    }
  };

  // Wenn kein Track ausgewählt ist, kann der Player sehr schlicht sein
  if (!currentTrack) {
    return (
      <div className="player-bar">
        <div className="player-bar__empty">
          <span>Select a track to start playback</span>
        </div>
      </div>
    );
  }

  return (
    <div className="player-bar">
      {/* Linker Bereich: Track-Infos */}
      <div className="player-bar__track-info">
        <div className="player-bar__title">{currentTrack.title}</div>
        <div className="player-bar__artist">{currentTrack.artist}</div>
      </div>

      {/* Mitte: Play/Pause + Seek */}
      <div className="player-bar__center">
        <button
          type="button"
          className="player-bar__play-button"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <div className="player-bar__seek">
          <span className="player-bar__time">
            {formatTime(progress)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={progress}
            onChange={handleSeek}
            className="player-bar__seek-input"
          />
          <span className="player-bar__time">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Rechts: Volume */}
      <div className="player-bar__right">
        <button
          type="button"
          className="player-bar__volume-button"
          onClick={toggleMute}
        >
          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={handleVolumeChange}
          className="player-bar__volume-input"
        />
      </div>
    </div>
  );
}
