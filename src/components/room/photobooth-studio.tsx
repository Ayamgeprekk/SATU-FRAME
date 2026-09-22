'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PreRollFrameBuffer } from '@/lib/sync/pre-roll-buffer';
import { AudioCountdownSynthesizer } from '@/lib/sync/audio-countdown';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCw,
  Copy,
  Check,
  Share2,
  Heart,
  Clock,
  Layers,
  SlidersHorizontal,
  Users,
} from 'lucide-react';

export interface CameraFilterPreset {
  id: string;
  name: string;
  tag: string;
  icon: string;
  cssFilter: string;
  description: string;
}

export const CAMERA_FILTERS: CameraFilterPreset[] = [
  {
    id: 'natural',
    name: 'Natural Studio',
    tag: 'Asli',
    icon: '🌿',
    cssFilter: 'none',
    description: 'Warna studio alami tanpa filter',
  },
  {
    id: 'vintage_warm',
    name: 'Vintage Hangat',
    tag: 'Warm',
    icon: '☕',
    cssFilter: 'sepia(0.28) contrast(1.08) brightness(1.04) saturate(1.15)',
    description: 'Nuansa hangat lembut bernostalgia',
  },
  {
    id: 'bw_noir',
    name: 'Monokrom Noir',
    tag: 'B&W',
    icon: '🎬',
    cssFilter: 'grayscale(1) contrast(1.25) brightness(1.02)',
    description: 'Hitam putih kontras tinggi dramatis',
  },
  {
    id: 'soft_pastel',
    name: 'Pastel Dream',
    tag: 'Pastel',
    icon: '🌸',
    cssFilter: 'brightness(1.08) contrast(0.96) saturate(1.25) hue-rotate(-5deg)',
    description: 'Cahaya lembut glowing romantis',
  },
  {
    id: 'kodak_film',
    name: 'Analog 35mm',
    tag: 'Film',
    icon: '🎞️',
    cssFilter: 'contrast(1.18) saturate(1.25) sepia(0.14) brightness(0.98)',
    description: 'Gradasi khas rol film analog klasik',
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Tokyo',
    tag: 'Neon',
    icon: '⚡',
    cssFilter: 'contrast(1.22) saturate(1.35) hue-rotate(15deg)',
    description: 'Saturasi neon modern malam hari',
  },
  {
    id: 'sunset_golden',
    name: 'Golden Hour',
    tag: 'Sunset',
    icon: '🌇',
    cssFilter: 'sepia(0.35) saturate(1.3) contrast(1.1) brightness(1.05)',
    description: 'Sinar keemasan senja hangat',
  },
  {
    id: 'nordic_clean',
    name: 'Nordic Clean',
    tag: 'Clean',
    icon: '❄️',
    cssFilter: 'contrast(1.12) saturate(0.85) brightness(1.04)',
    description: 'Tonal dingin minimalis Skandinavia',
  },
];

const POSE_GUIDES = [
  { shot: 1, title: 'Pose 1: Senyum Hangat', desc: 'Tatap lensa kamera dan berikan senyum terbaikmu.' },
  { shot: 2, title: 'Pose 2: Bentuk Hati', desc: 'Bentuk setengah hati di tepi frame agar menyatu dengan pasangan.' },
  { shot: 3, title: 'Pose 3: Ekspresi Lepas', desc: 'Pose ceria, tawa santai, atau gaya bebas favoritmu.' },
  { shot: 4, title: 'Pose 4: Tatap & Dekat', desc: 'Pose dekat seolah kalian sedang berada di satu bilik studio.' },
];

export interface PhotoboothStudioProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  role: 'creator' | 'partner';
  roomCode: string;
  shotNo: number; // 1..4
  totalShots?: number;
  tTargetServer?: number;
  offsetMs: number;
  deviceLagMs: number;
  onCaptureCompleted: (blob: Blob, tFrameServerEst: number) => void;
  peerName?: string;
  isPartnerConnected: boolean;
  selectedTemplateId?: string;
  templateName?: string;
  onSelectTemplate?: (templateId: string) => void;
  onStartSession: () => void;
  onAbortCapture?: (reason: string) => void;
  timeRemainingStr?: string;
  onExit?: () => void;
  onCopyLink?: () => void;
  onShareWhatsApp?: () => void;
  justJoinedBanner?: boolean;
}

export function PhotoboothStudio({
  localStream,
  remoteStream,
  role,
  roomCode,
  shotNo,
  totalShots = 4,
  tTargetServer,
  offsetMs,
  deviceLagMs,
  onCaptureCompleted,
  peerName,
  isPartnerConnected,
  selectedTemplateId,
  templateName,
  onSelectTemplate,
  onStartSession,
  onAbortCapture,
  timeRemainingStr = '29:45',
  onExit,
  onCopyLink,
  onShareWhatsApp,
  justJoinedBanner = false,
}: PhotoboothStudioProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const bufferRef = useRef<PreRollFrameBuffer | null>(null);
  const audioRef = useRef<AudioCountdownSynthesizer | null>(null);

  // Hardware controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Camera aesthetic filters (replaces redundant template selector)
  const [selectedFilterId, setSelectedFilterId] = useState<string>('natural');
  const activeFilter = CAMERA_FILTERS.find((f) => f.id === selectedFilterId) || CAMERA_FILTERS[0];
  const activeFilterRef = useRef(activeFilter);
  activeFilterRef.current = activeFilter;

  // Shutter & Countdown states
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [holdText, setHoldText] = useState(false);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }

    if (localVideoRef.current && localStream && !bufferRef.current) {
      const buffer = new PreRollFrameBuffer(12, 960);
      bufferRef.current = buffer;
      buffer.start(localVideoRef.current);
    }

    if (!audioRef.current) {
      audioRef.current = new AudioCountdownSynthesizer();
    }
  }, [localStream]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [remoteStream]);

  // Toggle mic
  const handleToggleMic = () => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    const nextState = !isMicOn;
    audioTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setIsMicOn(nextState);
  };

  // Toggle camera
  const handleToggleCamera = () => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    const nextState = !isCameraOn;
    videoTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setIsCameraOn(nextState);
  };

  // Toggle mirror view
  const handleToggleMirror = () => {
    setIsMirrored((prev) => !prev);
  };

  // Toggle speaker
  const handleToggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  // Copy room code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Synchronized Countdown Loop (Tahap 1: Photobooth Shutter Experience)
  useEffect(() => {
    if (!tTargetServer) return;

    audioRef.current?.unlock();

    let animFrameId: number;
    let hasCaptured = false;
    let lastTick = 4;

    const tLocalTarget = tTargetServer - offsetMs;
    const tLocalTrigger = tLocalTarget - deviceLagMs;

    const tick = () => {
      const now = performance.now();
      const timeRemaining = tLocalTarget - now;

      // 3-2-1 Countdown Ticks with audio synthesis
      if (timeRemaining <= 3200 && timeRemaining > 2000 && lastTick > 3) {
        setCountdownNum(3);
        audioRef.current?.playTick();
        lastTick = 3;
      } else if (timeRemaining <= 2000 && timeRemaining > 1000 && lastTick > 2) {
        setCountdownNum(2);
        audioRef.current?.playTick();
        lastTick = 2;
      } else if (timeRemaining <= 1000 && timeRemaining > 0 && lastTick > 1) {
        setCountdownNum(1);
        setHoldText(true);
        audioRef.current?.playTick();
        lastTick = 1;
      }

      // Shutter Trigger Point
      if (now >= tLocalTrigger && !hasCaptured) {
        hasCaptured = true;
        setCountdownNum(0);
        setIsFlashing(true);
        audioRef.current?.playShutter();

        setTimeout(() => setIsFlashing(false), 120);

        // Extract best frame from PreRoll buffer
        if (bufferRef.current) {
          const frame = bufferRef.current.extractBestFrame(tLocalTarget);
          if (frame) {
            const canvas = document.createElement('canvas');
            canvas.width = frame.bitmap.width;
            canvas.height = frame.bitmap.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              if (activeFilterRef.current.cssFilter && activeFilterRef.current.cssFilter !== 'none') {
                ctx.filter = activeFilterRef.current.cssFilter;
              }
              ctx.drawImage(frame.bitmap, 0, 0);
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    const previewUrl = URL.createObjectURL(blob);
                    setCapturedPreviewUrl(previewUrl);
                    const tFrameServerEst = frame.tFrame + offsetMs;
                    onCaptureCompleted(blob, tFrameServerEst);
                  }
                  canvas.width = 0;
                  canvas.height = 0;
                  frame.bitmap.close();
                },
                'image/jpeg',
                0.9
              );
            }
          }
        }

        setTimeout(() => {
          setHoldText(false);
          setCountdownNum(null);
          setCapturedPreviewUrl(null);
        }, 800);
      }

      if (!hasCaptured || timeRemaining > -1000) {
        animFrameId = requestAnimationFrame(tick);
      }
    };

    animFrameId = requestAnimationFrame(tick);

    // Abort if user leaves tab during countdown
    const handleVisibilityChange = () => {
      if (document.hidden && !hasCaptured) {
        onAbortCapture?.('TAB_HIDDEN_DURING_COUNTDOWN');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tTargetServer, offsetMs, deviceLagMs, onCaptureCompleted, onAbortCapture]);

  const currentPose = POSE_GUIDES.find((p) => p.shot === shotNo) || POSE_GUIDES[0];
  const isCountingDown = tTargetServer !== undefined;

  return (
    <div className="relative flex h-full min-h-[100dvh] w-full max-w-md md:max-w-xl lg:max-w-2xl flex-col justify-between overflow-x-hidden bg-black px-3.5 py-3 text-white select-none">
      {/* 1. Flash Overlay on Shutter Trigger */}
      {isFlashing && <div className="fixed inset-0 z-50 screen-flash bg-white pointer-events-none" />}

      {/* 2. Top Partner Joined Banner (Toast) */}
      {justJoinedBanner && (
        <div className="z-30 mb-2 flex items-center justify-between rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-2 text-xs text-emerald-200 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black text-[11px] font-bold">
              ✓
            </span>
            <span className="font-semibold text-emerald-100">Temanmu bergabung!</span>
          </div>
          <span className="text-[11px] text-emerald-300">Live VC Aktif</span>
        </div>
      )}

      {/* 3. Top Header Bar */}
      <div className="z-20 w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/90 px-3.5 py-2.5 shadow-md backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          {/* Room info & copy */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Booth</span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-amber-400 transition"
                title="Klik untuk salin kode"
              >
                <span>Kode: {roomCode}</span>
                {copiedCode ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3 text-zinc-400" />
                )}
              </button>
            </div>
            {/* Connection Status Pill */}
            <span
              className={`ml-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                isPartnerConnected
                  ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/70 border-amber-500/30 text-amber-300'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isPartnerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                }`}
              />
              {isPartnerConnected ? 'Teman terhubung' : 'Menunggu teman...'}
            </span>
          </div>

          {/* Active Template Badge (Selected in /create) */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 px-3 py-1 text-[11px] font-medium text-zinc-300">
            <span>🎞️</span>
            <span className="max-w-[130px] truncate">{templateName || 'Frame Studio'}</span>
          </div>

          {/* Right Timer & Exit */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 px-2.5 py-1 text-[11px] font-mono text-zinc-300">
              <Clock className="h-3 w-3 text-zinc-400" />
              <span>SISA {timeRemainingStr}</span>
            </div>
            {onExit && (
              <button
                onClick={onExit}
                className="rounded-xl border border-zinc-700/70 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition min-h-[44px] flex items-center"
              >
                Selesai
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Panduan pose atau judul studio */}
      <div className="my-2.5 text-center">
        {isCountingDown ? (
          <div className="rounded-2xl border border-teal-500/30 bg-teal-950/50 p-2.5 backdrop-blur-sm animate-in fade-in">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-teal-400">
              <Camera className="h-3.5 w-3.5 text-teal-400" />
              <span>
                FOTO {shotNo} DARI {totalShots}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">{currentPose.title}</h3>
            <p className="text-[11px] sm:text-xs text-zinc-300">{currentPose.desc}</p>
          </div>
        ) : (
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Empat foto, satu strip.
            </h1>
            <p className="text-xs text-zinc-400">
              {isPartnerConnected
                ? 'Kalian sudah terhubung secara langsung. Pilih filter & mulai sesi foto!'
                : 'Ajak pasangan atau temanmu masuk untuk foto bareng seperti di photobooth sungguhan.'}
            </p>
          </div>
        )}
      </div>

      {/* Kompartemen video dua arah bilik foto */}
      <div className="relative my-auto grid w-full grid-cols-2 gap-2.5 sm:gap-3.5">
        {/* Sync Telemetry Bridge Pill */}
        <div className="col-span-2 flex items-center justify-center -my-1 z-10">
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-mono border backdrop-blur-md shadow-sm ${
            isPartnerConnected
              ? 'bg-teal-950/80 border-teal-500/30 text-teal-300'
              : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isPartnerConnected ? 'bg-teal-400 animate-ping' : 'bg-zinc-500'}`} />
            <span>{isPartnerConnected ? 'SYNC DUAL-CAM AKTIF (ΔT < 25ms)' : 'STANDBY: MENUNGGU LIVE LINK TEMAN'}</span>
          </div>
        </div>

        {/* Left Card: Kamu (Local Feed) */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-zinc-800 bg-zinc-950 shadow-2xl group">
          {/* Viewfinder HUD Corner Brackets */}
          <div className="pointer-events-none absolute inset-2.5 z-10">
            <div className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-teal-400/70 rounded-tl-sm" />
            <div className="absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-teal-400/70 rounded-tr-sm" />
            <div className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-teal-400/70 rounded-bl-sm" />
            <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-teal-400/70 rounded-br-sm" />
            {/* Center Focus Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 border border-white/20 rounded-full opacity-30 group-hover:opacity-60 transition-opacity" />
          </div>

          {/* Camera Telemetry Header (Top Left) */}
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300 border border-white/10 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>REC</span>
            <span className="text-zinc-600">|</span>
            <span>HD</span>
            <span className="text-zinc-600">|</span>
            <span>{activeFilter.tag}</span>
          </div>

          {capturedPreviewUrl ? (
            <img
              src={capturedPreviewUrl}
              alt="Freeze preview"
              style={{ filter: activeFilter.cssFilter }}
              className={isMirrored ? 'h-full w-full object-cover -scale-x-100' : 'h-full w-full object-cover'}
            />
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ filter: activeFilter.cssFilter }}
              className={`h-full w-full object-cover transition-transform duration-300 ${isMirrored ? '-scale-x-100' : ''}`}
            />
          )}

          {/* Camera Off Overlay */}
          {!isCameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 text-zinc-400 z-20">
              <CameraOff className="h-8 w-8 mb-1 text-zinc-400" />
              <span className="text-[11px]">Kamera nonaktif</span>
            </div>
          )}

          {/* Flip / Mirror Button (Top Right) */}
          <button
            onClick={handleToggleMirror}
            className="absolute top-2 right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md hover:bg-black/80 active:scale-95 transition min-h-[44px] min-w-[44px]"
            title="Mirror kamera"
            aria-label="Mirror kamera"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Mic Muted Badge */}
          {!isMicOn && (
            <div className="absolute bottom-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-red-600/80 text-white shadow-md">
              <MicOff className="h-3.5 w-3.5" />
            </div>
          )}

          {/* Bottom Badge: Kamu */}
          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 rounded-full bg-black/65 border border-white/15 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
            <span>Kamu ({role === 'creator' ? 'Host' : 'Tamu'})</span>
          </div>
        </div>

        {/* Right Card: Teman (Remote Partner Feed) */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-zinc-800 bg-zinc-950 shadow-2xl group">
          {/* Viewfinder HUD Corner Brackets */}
          <div className="pointer-events-none absolute inset-2.5 z-10">
            <div className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-amber-400/70 rounded-tl-sm" />
            <div className="absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-amber-400/70 rounded-tr-sm" />
            <div className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-amber-400/70 rounded-bl-sm" />
            <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-amber-400/70 rounded-br-sm" />
            {/* Center Focus Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 border border-white/20 rounded-full opacity-30 group-hover:opacity-60 transition-opacity" />
          </div>

          {remoteStream && isPartnerConnected ? (
            <>
              {/* Partner Telemetry Header */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300 border border-white/10 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>LIVE FEED</span>
              </div>

              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ filter: activeFilter.cssFilter }}
                className="h-full w-full object-cover transition-all duration-300"
              />
              {/* Bottom Badge: Teman */}
              <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 rounded-full bg-black/65 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur-md">
                <Heart className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{peerName || 'Teman'}</span>
              </div>
            </>
          ) : (
            /* Waiting State Inside Video Card */
            <div className="flex h-full w-full flex-col items-center justify-center border-2 border-dashed border-zinc-800 bg-zinc-950/80 p-3 text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-zinc-200">Menunggu teman masuk...</p>
              <p className="mt-1 text-[10px] text-zinc-400 leading-tight">
                Bagikan tautan room ini ke pasanganmu
              </p>

              <div className="mt-3 flex flex-col w-full gap-1.5">
                {onCopyLink && (
                  <button
                    onClick={onCopyLink}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-800 border border-zinc-700 py-2 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 min-h-[44px]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin Tautan</span>
                  </button>
                )}
                {onShareWhatsApp && (
                  <button
                    onClick={onShareWhatsApp}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600/90 py-2 text-[11px] font-semibold text-white hover:bg-emerald-500 min-h-[44px]"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Countdown Overlay */}
        {((countdownNum !== null && countdownNum > 0) || holdText) && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-black/60 backdrop-blur-[3px]">
            {countdownNum !== null && countdownNum > 0 && (
              <div className="relative flex items-center justify-center">
                {/* Glowing Countdown Ring */}
                <div className="absolute h-36 w-36 rounded-full border-4 border-teal-400/40 animate-ping opacity-75" />
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-black/70 border-2 border-teal-400 text-6xl sm:text-7xl font-mono font-black text-white shadow-[0_0_50px_rgba(45,212,191,0.5)]">
                  {countdownNum}
                </div>
              </div>
            )}
            {holdText && (
              <div className="mt-4 flex items-center gap-2 rounded-full bg-teal-400 px-5 py-2 text-xs sm:text-sm font-black tracking-wide text-zinc-950 shadow-2xl">
                <Camera className="h-4 w-4 text-zinc-950" />
                <span>SENYUM & TAHAN POSE!</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera filter selector */}
      {!isCountingDown && (
        <div className="my-2.5 w-full space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-teal-400" />
              FILTER FOTO STUDIO ({activeFilter.name})
            </span>
            <span className="text-[10px] text-teal-400 font-mono font-medium">
              {activeFilter.tag}
            </span>
          </div>

          {/* Horizontal Scrolling Filter Cards */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none no-scrollbar">
            {CAMERA_FILTERS.map((filter) => {
              const isSelected = selectedFilterId === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSelectedFilterId(filter.id)}
                  className={`relative flex min-w-[96px] flex-col items-center rounded-xl p-2 text-center transition min-h-[44px] ${
                    isSelected
                      ? 'border-2 border-teal-400 bg-teal-950/40 shadow-md shadow-teal-950/50'
                      : 'border border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                  }`}
                >
                  {/* Filter Swatch / Icon */}
                  <div
                    className="mb-1.5 flex h-11 w-full items-center justify-center rounded-lg text-xl shadow-inner border border-white/10 bg-zinc-900"
                  >
                    <span>{filter.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-200 line-clamp-1">
                    {filter.name}
                  </span>
                  <span className="text-[9px] text-zinc-400 mt-0.5">
                    {filter.tag}
                  </span>
                  {isSelected && (
                    <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-black shadow-sm">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom controls and shutter trigger */}
      <div className="z-20 w-full space-y-2.5 pt-1">
        {/* Toggle Pills */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleToggleCamera}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition min-h-[44px] ${
              isCameraOn
                ? 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                : 'border-red-500/40 bg-red-950/40 text-red-300'
            }`}
          >
            {isCameraOn ? <Camera className="h-4 w-4 text-teal-400" /> : <CameraOff className="h-4 w-4" />}
            <span>Kamera {isCameraOn ? 'nyala' : 'mati'}</span>
          </button>

          <button
            onClick={handleToggleMic}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition min-h-[44px] ${
              isMicOn
                ? 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                : 'border-red-500/40 bg-red-950/40 text-red-300'
            }`}
          >
            {isMicOn ? <Mic className="h-4 w-4 text-teal-400" /> : <MicOff className="h-4 w-4" />}
            <span>Mic {isMicOn ? 'nyala' : 'mati'}</span>
          </button>

          <button
            onClick={handleToggleSpeaker}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition min-h-[44px] min-w-[44px]"
            title="Speaker"
          >
            {isSpeakerOn ? <Volume2 className="h-4 w-4 text-teal-400" /> : <VolumeX className="h-4 w-4 text-zinc-400" />}
          </button>
        </div>

        {/* Studio Tactile Shutter Trigger */}
        <div className="pt-1">
          <button
            onClick={onStartSession}
            disabled={isCountingDown}
            className="btn-shutter group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-teal-500 to-teal-700 px-6 py-4 text-base font-bold text-white shadow-2xl transition hover:from-teal-400 hover:to-teal-600 active:scale-[0.97] disabled:opacity-60 min-h-[56px] border-2 border-teal-300/40"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 border border-white/40 shadow-inner group-hover:scale-110 transition-transform">
              <Camera className="h-4 w-4 text-white" />
            </div>
            {isCountingDown ? (
              <div className="flex items-center gap-2 font-mono text-sm tracking-wider">
                <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />
                <span>MEMOTRET POSE #{shotNo} DARI {totalShots}...</span>
              </div>
            ) : (
              <div className="flex flex-col text-left">
                <span className="text-sm font-black tracking-wide">AMBIL FOTO POSE #{shotNo} (SHUTTER 3-2-1)</span>
                <span className="text-[10px] text-teal-100 font-medium">Sinkronisasi blitz audio-visual otomatis</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
