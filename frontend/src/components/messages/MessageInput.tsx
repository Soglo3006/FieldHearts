"use client";

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AppImage from '@/components/ui/AppImage';
import { Send, X, Paperclip, Mic } from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  attachedFile: File | null;
  attachmentPreview: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onVoiceMessage?: (audioBlob: Blob, duration: number) => Promise<void>;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled,
  attachedFile,
  attachmentPreview,
  onFileSelect,
  onRemoveAttachment,
  fileInputRef,
  onVoiceMessage,
}: MessageInputProps) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const shouldSendRecordingRef = useRef(true);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(20).fill(0));
  const streamRef = useRef<MediaStream | null>(null);

  const levelHeightClasses = ['h-1', 'h-1.5', 'h-2', 'h-3', 'h-4', 'h-5', 'h-6', 'h-7', 'h-8'];

  const getLevelHeightClass = (level: number) => {
    const index = Math.min(levelHeightClasses.length - 1, Math.max(0, Math.round(level * (levelHeightClasses.length - 1))));
    return levelHeightClasses[index];
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setAudioLevels(Array(20).fill(0));
  };

  const cleanupRecordingResources = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopAnimation();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  };

  useEffect(() => {
    return () => {
      cleanupRecordingResources();
    };
  }, []);

  const startRecording = async () => {
    if (isRecording || disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      shouldSendRecordingRef.current = true;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();
      setRecordingDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setPopoverOpen(false);

      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const drawWave = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const levels = Array.from({ length: 20 }, (_, i) => {
          const val = dataArray[Math.floor(i * dataArray.length / 20)] / 255;
          return Math.max(0.05, val);
        });
        setAudioLevels(levels);
        animationRef.current = requestAnimationFrame(drawWave);
      };
      drawWave();

    } catch {
      cleanupRecordingResources();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingDuration(0);
      toast.error(t("messages.microphoneNotAccessible"));
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      cleanupRecordingResources();
      if (shouldSendRecordingRef.current && duration >= 1) {
        await onVoiceMessage?.(audioBlob, duration);
      }
    };

    recorder.stop();
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
  };

  const cancelRecording = () => {
    shouldSendRecordingRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecordingResources();
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const pauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.pause();
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopAnimation();
  };

  const resumeRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.resume();
    setIsPaused(false);
    
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);

    // Relance l'animation
    const drawWave = () => {
      if (!analyserRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const levels = Array.from({ length: 20 }, (_, i) => {
        const val = dataArray[Math.floor(i * dataArray.length / 20)] / 255;
        return Math.max(0.05, val);
      });
      setAudioLevels(levels);
      animationRef.current = requestAnimationFrame(drawWave);
    };
    drawWave();
  };

  return (
    <div className="sticky bottom-0 p-4 border-t bg-white">
      {/* Preview fichier */}
      {attachedFile && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            {attachmentPreview ? (
              <AppImage src={attachmentPreview} alt={t('common.preview')} width={64} height={64} className="h-16 w-16 object-cover rounded" />
            ) : (
              <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-xs text-gray-500">PDF</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{attachedFile.name}</p>
              <p className="text-xs text-gray-500">{(attachedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onRemoveAttachment} title={t('common.remove')} aria-label={t('common.remove')} className="text-gray-400 hover:text-red-500">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3 items-center">
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={onFileSelect} className="hidden" title={t("messages.fileAttachment")} aria-label={t("messages.fileAttachment")} />

        {/* Bouton + avec popover */}
        {!isRecording && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 cursor-pointer" disabled={disabled}>
                <span className="text-xl">+</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" side="top" align="start">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => { fileInputRef.current?.click(); setPopoverOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm text-gray-700 w-full text-left cursor-pointer"
                >
                  <Paperclip className="h-4 w-4 text-gray-500" />
                  {t("messages.fileAttachment")}
                </button>
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="flex items-center gap-3  px-3 py-2 rounded-lg hover:bg-gray-100 text-sm text-gray-700 w-full text-left cursor-pointer"
                >
                  <Mic className="h-4 w-4 text-gray-500" />
                  {t("messages.voiceMessage")}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Interface d'enregistrement */}
        {isRecording ? (
          <div className="flex-1 flex items-center gap-3 bg-green-50 rounded-full px-4 py-2 border border-green-200">
            <div className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${isPaused ? 'bg-amber-500' : 'bg-green-600'}`} />
            <span className="text-sm font-medium text-green-700 shrink-0">
              {formatDuration(recordingDuration)}
            </span>

            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="shrink-0 cursor-pointer text-green-700 hover:text-green-900"
            >
              {isPaused ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              )}
            </button>
          
              {/* Ondes audio avec progression style WaveSurfer */}
              <div className="flex-1 flex items-center justify-center gap-0.5 h-8">
                {Array.from({ length: 40 }, (_, i) => {
                  // Progression basée sur le temps (max 60s)
                  const progressRatio = Math.min(recordingDuration / 60, 1);
                  const progressIndex = Math.floor(progressRatio * 40);
                  const isFilled = i <= progressIndex;
                  
                  // Hauteur basée sur les niveaux audio (réutilise les 20 niveaux sur 40 barres)
                  const levelIndex = Math.floor(i * audioLevels.length / 40);
                  const level = audioLevels[levelIndex] || 0.05;

                  return (
                    <div
                      key={i}
                      className={`w-0.75 rounded-full transition-all duration-75 ${getLevelHeightClass(level)} ${isFilled ? 'bg-green-700' : 'bg-green-300'}`}
                    />
                  );
                })}
              </div>

            <button type="button" title={t('common.cancel')} aria-label={t('common.cancel')} onClick={cancelRecording} className="text-gray-400 hover:text-gray-600 shrink-0 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder={t("messages.typeMessage")}
            disabled={disabled}
            className="flex-1"
          />
        )}

        {/* Bouton envoyer / stop enregistrement */}
        {isRecording ? (
          <Button
            type="button"
            onClick={() => void stopRecording()}
            size="icon"
            className="bg-green-700 hover:bg-green-800 shrink-0 cursor-pointer"
          >
            <Mic className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onSend}
            disabled={(!value.trim() && !attachedFile) || disabled}
            size="icon"
            className="bg-green-700 hover:bg-green-800 shrink-0 cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}