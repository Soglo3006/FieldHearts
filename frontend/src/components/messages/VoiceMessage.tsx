"use client";

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessageProps {
  audioUrl: string;
  duration: number;
  isOwn: boolean;
}

export function VoiceMessage({ audioUrl, duration, isOwn }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(Math.floor(audio.currentTime));
      setProgress((audio.currentTime / (audio.duration || duration)) * 100);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * (audio.duration || duration);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-2xl min-w-[200px] max-w-[280px] ${
      isOwn ? 'bg-green-700' : 'bg-white border'
    }`}>
      {/* Audio caché mais dans le DOM */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
          isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-green-700 hover:bg-green-800'
        }`}
      >
        {isPlaying
          ? <Pause className="h-4 w-4 text-white" />
          : <Play className="h-4 w-4 text-white" />
        }
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div
          className={`h-1 rounded-full cursor-pointer ${isOwn ? 'bg-white/30' : 'bg-gray-200'}`}
          onClick={handleProgressClick}
        >
          <div
            className={`h-full rounded-full transition-all ${isOwn ? 'bg-white' : 'bg-green-700'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </span>
      </div>
    </div>
  );
}