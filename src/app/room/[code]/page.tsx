'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { InAppBrowserInterceptor } from '@/components/room/in-app-interceptor';
import { ScreenGuard } from '@/components/room/screen-guard';
import { PhotoboothStudio } from '@/components/room/photobooth-studio';
import { TimeSyncClient } from '@/lib/sync/time-sync';
import { calibrateDeviceShutterLag, CalibrationResult } from '@/lib/sync/shutter-calibrator';
import { localShotStorage } from '@/lib/storage/indexeddb-storage';
import { composePhotostripClient } from '@/lib/render/canvas-composer';
import { getTemplateById } from '@/lib/render/templates';
import { renderCrashDetector } from '@/lib/render/crash-detector';
import { Session, Participant, SessionPhoto } from '@/types/session';
import { Copy, Check, Share2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase();

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [photos, setPhotos] = useState<SessionPhoto[]>([]);
  const [role, setRole] = useState<'creator' | 'partner'>('creator');
  const [participantId, setParticipantId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hardware & Camera states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [calibration, setCalibration] = useState<CalibrationResult | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const [rttMs, setRttMs] = useState(0);

  // Capture scheduling & composition
  const [tTargetServer, setTTargetServer] = useState<number | undefined>(undefined);
  const [isComposing, setIsComposing] = useState(false);

  // Time & partner notification
  const [justJoinedBanner, setJustJoinedBanner] = useState(false);
  const [timeRemainingStr, setTimeRemainingStr] = useState('29:45');
  const prevPartsLenRef = useRef(1);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const timeSyncRef = useRef<TimeSyncClient | null>(null);

  // Initialize camera and microphone for live peer video
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (isMounted) {
          setLocalStream(stream);

          // Run silent background shutter calibration
          const testVideo = document.createElement('video');
          testVideo.srcObject = stream;
          testVideo.muted = true;
          testVideo.playsInline = true;
          testVideo.play().then(async () => {
            try {
              const calib = await calibrateDeviceShutterLag(testVideo, 3);
              if (isMounted) setCalibration(calib);
            } catch {}
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('Audio-video getUserMedia failed, retrying video only:', err);
        try {
          const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
          if (isMounted) {
            setLocalStream(videoOnlyStream);
          }
        } catch (vErr) {
          console.error('Camera access completely denied:', vErr);
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
    };
  }, []);

  // Join room and initialize session
  useEffect(() => {
    if (!roomCode) return;

    async function initRoom() {
      try {
        const res = await fetch('/api/sessions/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode,
            displayName: role === 'creator' ? 'Creator' : 'Partner',
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'Room tidak ditemukan');
          setLoading(false);
          return;
        }

        const sess: Session = data.session;
        setSession(sess);

        // Determine if current tab is creator or partner
        const storedToken = localStorage.getItem(`sf_token_${sess.id}`);
        const storedRole = localStorage.getItem(`sf_role_${sess.id}`);

        if (storedToken && storedRole === 'creator') {
          setRole('creator');
          setParticipantId(storedToken);
        } else {
          setRole('partner');
          setParticipantId(data.participant.id);
          localStorage.setItem(`sf_token_${sess.id}`, data.participant.id);
          localStorage.setItem(`sf_role_${sess.id}`, 'partner');
          trackEvent('partner_join', { sessionId: sess.id, participantId: data.participant.id });
        }

        setLoading(false);
      } catch {
        setErrorMsg('Gagal terhubung ke room.');
        setLoading(false);
      }
    }

    initRoom();
  }, [roomCode, role]);

  // Connect WebSocket and NTP time synchronization
  useEffect(() => {
    if (!session || !participantId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Initialize NTP time sync client
    const timeSync = new TimeSyncClient(
      (t0) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'TIME_PING', payload: { t0 } }));
        }
      },
      (offset, rtt) => {
        setOffsetMs(offset);
        setRttMs(rtt);
      }
    );
    timeSyncRef.current = timeSync;

    ws.onopen = () => {
      // Join Room
      ws.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          payload: { sessionId: session.id, participantId },
        })
      );
      // Start ping-pong sync
      timeSync.startSync(8);
      timeSync.startPeriodicSync(10000);
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        switch (type) {
          case 'TIME_PONG':
            timeSync.handlePong(payload.t0, payload.ts);
            break;

          case 'STATE_SNAPSHOT':
            if (payload.session) setSession(payload.session);
            if (payload.participants) setParticipants(payload.participants);
            if (payload.photos) setPhotos(payload.photos);
            break;

          case 'PRESENCE':
            if (payload.participants) {
              setParticipants(payload.participants);
              // If creator and partner just showed up, create offer
              if (role === 'creator' && payload.participants.length >= 2) {
                createOffer();
              }
            }
            if (payload.session) setSession(payload.session);
            break;

          case 'SCHEDULE_CAPTURE':
            setTTargetServer(payload.tTargetServer);
            trackEvent('ready_both', { sessionId: session?.id, participantId });
            break;

          case 'CAPTURE_ABORT':
            setTTargetServer(undefined);
            if (payload.session) setSession(payload.session);
            if (payload.participants) setParticipants(payload.participants);
            break;

          case 'WEBRTC_SIGNAL':
            handleWebRtcSignal(payload.signal);
            break;
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    };

    ws.onclose = () => {
      timeSync.stopPeriodicSync();
    };

    return () => {
      ws.close();
      timeSync.stopPeriodicSync();
    };
  }, [session?.id, participantId, role]);

  // 4. Partner Join Notification Banner
  useEffect(() => {
    if (participants.length >= 2 && prevPartsLenRef.current < 2) {
      setJustJoinedBanner(true);
      const timer = setTimeout(() => setJustJoinedBanner(false), 5000);
      return () => clearTimeout(timer);
    }
    prevPartsLenRef.current = participants.length;
  }, [participants.length]);

  // 5. Countdown timer for remaining session time
  useEffect(() => {
    if (!session?.expiresAt) return;
    const updateTimer = () => {
      const diff = Math.max(0, session.expiresAt - Date.now());
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeRemainingStr(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session?.expiresAt]);

  // 6. WebRTC P2P Video Call Setup
  const initWebRtc = useCallback(
    async (stream: MediaStream) => {
      if (peerConnectionRef.current) return;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' },
        ],
        iceCandidatePoolSize: 2,
      });
      peerConnectionRef.current = pc;

      // Add local audio and video tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Bitrate cap 400 kbps for relay savings
      const senders = pc.getSenders();
      for (const sender of senders) {
        if (sender.track?.kind === 'video') {
          try {
            const encParams = sender.getParameters();
            if (!encParams.encodings || encParams.encodings.length === 0) {
              encParams.encodings = [{}];
            }
            encParams.encodings[0].maxBitrate = 400_000;
            encParams.encodings[0].maxFramerate = 24;
            sender.setParameters(encParams).catch(() => {});
          } catch {}
        }
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'WEBRTC_SIGNAL',
              payload: { signal: { candidate: event.candidate } },
            })
          );
        }
      };

      // If creator and partner already present, create offer immediately
      if (role === 'creator' && participants.length >= 2) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'WEBRTC_SIGNAL',
              payload: { signal: { offer } },
            })
          );
        }
      }
    },
    [role, participants.length]
  );

  const createOffer = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || role !== 'creator') return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'WEBRTC_SIGNAL',
            payload: { signal: { offer } },
          })
        );
      }
    } catch (e) {
      console.warn('createOffer error:', e);
    }
  };

  const handleWebRtcSignal = async (signal: any) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    if (signal.offer) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'WEBRTC_SIGNAL',
            payload: { signal: { answer } },
          })
        );
      }
    } else if (signal.answer) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
    } else if (signal.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch {}
    }
  };

  // Start WebRTC when localStream is ready
  useEffect(() => {
    if (localStream) {
      initWebRtc(localStream);
    }
  }, [localStream, initWebRtc]);

  // 7. Handle Template Selection (Realtime sync)
  const handleSelectTemplate = (templateId: string) => {
    if (!session) return;
    setSession((prev) => (prev ? { ...prev, templateId } : null));

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UPDATE_TEMPLATE',
          payload: { sessionId: session.id, templateId },
        })
      );
    }
  };

  // 8. Handle "Mulai Sesi" Click (Triggers Ready Gate & Countdown)
  const handleStartSession = () => {
    if (!session || wsRef.current?.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'READY',
        payload: {
          ready: true,
          deviceLagMs: calibration?.medianLagMs || 50,
          activeCaptureMode: calibration?.activeCaptureMode || 'grab',
          offsetMs,
          wsRttMs: rttMs,
          tabVisible: !document.hidden,
        },
      })
    );
  };

  // 9. Handle Photo Shot Captured (IndexedDB Write-Ahead + Commit)
  const handleCaptureCompleted = async (blob: Blob, tFrameServerEst: number) => {
    if (!session) return;
    const shotNo = session.currentShotNo;

    const deltaMs = tTargetServer ? Math.round(Math.abs(tFrameServerEst - tTargetServer)) : 0;
    trackEvent('shot_captured', {
      sessionId: session.id,
      participantId,
      properties: { shotNo, deltaMs },
    });

    // Step A: Write-Ahead to local IndexedDB (PRD §11.5)
    await localShotStorage.saveShot(session.id, shotNo, participantId, blob);

    // Step B: Upload photo incrementally to server
    const formData = new FormData();
    formData.append('file', blob, `shot_${shotNo}.jpg`);
    formData.append('participantId', participantId);
    formData.append('tFrameServerEst', tFrameServerEst.toString());

    try {
      const res = await fetch(`/api/sessions/${session.id}/shots/${shotNo}/commit`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await localShotStorage.markSynced(session.id, shotNo, participantId);
        const data = await res.json();
        if (data.session) {
          setSession(data.session);
        }
      }
    } catch (err) {
      console.error('Incremental upload error:', err);
    }
  };

  // 10. Handle Final Photostrip Composition
  const handleCompose = async () => {
    if (!session) return;
    setIsComposing(true);

    const keepaliveTimer = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'COMPOSITING_KEEPALIVE',
            payload: { sessionId: session.id },
          })
        );
      }
    }, 2000);

    try {
      const isCrash = await renderCrashDetector.isCrashLoop(session.id);
      let stripBlob: Blob | null = null;

      if (!isCrash) {
        await renderCrashDetector.recordRenderStart(session.id);

        const photoInputs = [];
        for (let i = 1; i <= 4; i++) {
          const local = await localShotStorage.getShot(session.id, i, participantId);
          if (local) {
            const slotIdx = (i - 1) * 2 + (role === 'creator' ? 0 : 1);
            photoInputs.push({ slotIndex: slotIdx, blob: local.blob });
          }
        }

        try {
          stripBlob = await composePhotostripClient({
            templateId: session.templateId,
            photos: photoInputs,
            watermark: session.tier === 'free',
          });
          await renderCrashDetector.recordRenderSuccess(session.id);
        } catch (clientErr) {
          console.warn('Client canvas render failed, switching to server fallback:', clientErr);
        }
      }

      if (!stripBlob) {
        const fallbackRes = await fetch(`/api/sessions/${session.id}/render`, { method: 'POST' });
        if (fallbackRes.ok) {
          stripBlob = await fallbackRes.blob();
          await renderCrashDetector.recordRenderSuccess(session.id);
        }
      }

      if (stripBlob) {
        router.push(`/r/${session.resultToken}`);
      }
    } catch {
      alert('Gagal menyusun photostrip. Coba lagi.');
    } finally {
      clearInterval(keepaliveTimer);
      setIsComposing(false);
    }
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const url = `${window.location.origin}/room/${roomCode}`;
    const text = encodeURIComponent(
      `Yuk foto bareng di Satu Frame! Masuk lewat link ini: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleRequestRetake = (shotNo: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'RETAKE_REQUEST',
          payload: { shotNo },
        })
      );
    }
  };

  const handleAbortCapture = (reason: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && session) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CAPTURE_ABORT',
          payload: { sessionId: session.id, participantId, reason },
        })
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-teal-400" />
          <p className="text-sm font-medium text-zinc-300">Menghubungkan ke studio...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center space-y-4">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
          <h2 className="text-lg font-bold">Terjadi Kendala</h2>
          <p className="text-xs text-zinc-400">{errorMsg}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full rounded-xl bg-zinc-800 py-3 text-xs font-semibold text-white hover:bg-zinc-700 min-h-[44px]"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const partner = participants.find((p) => p.role === 'partner');
  const isPartnerConnected = participants.length >= 2;

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center overflow-x-hidden">
      {/* In-App Browser Detector & Orientation Guard */}
      <InAppBrowserInterceptor />
      <ScreenGuard />

      {/* Review dan opsi retake setelah 4 bidikan */}
      {session?.state === 'REVIEW' ? (
        <div className="w-full max-w-md md:max-w-xl p-6 space-y-6 text-center">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 md:p-8 space-y-5 backdrop-blur-md shadow-2xl">
            <div className="mx-auto mb-2 h-1.5 w-24 rounded-full bg-zinc-950 border border-zinc-800 shadow-inner" />
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-white tracking-wide">Semua 4 Pose Selesai!</h2>
            <p className="text-xs md:text-sm text-zinc-300">
              Hasil bidikanmu dan pasanganmu berhasil tersimpan. Kamu bisa mengulang salah satu pose bila kurang pas (sisa kesempatan retake: {session.maxRetake - session.retakeUsed}x).
            </p>

            {/* 4 Shots Grid with Retake Option */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {[1, 2, 3, 4].map((num) => (
                <div
                  key={num}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-3.5 flex flex-col items-center justify-between gap-3 shadow-inner"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400 font-mono">
                    <span>POSE #{num}</span>
                  </div>
                  <div className="h-14 w-full rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-400 text-xs font-medium">
                    ✓ Tersimpan
                  </div>
                  {session.retakeUsed < session.maxRetake && (
                    <button
                      onClick={() => handleRequestRetake(num)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-700 min-h-[44px] flex items-center justify-center transition"
                    >
                      Ulangi #{num}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleCompose}
              disabled={isComposing}
              className="btn-shutter flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600 py-4 text-base font-extrabold text-white shadow-xl shadow-teal-950/60 hover:brightness-110 active:scale-95 disabled:opacity-50 min-h-[52px] mt-4 transition"
            >
              {isComposing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sedang Menyusun Photostrip...</span>
                </>
              ) : (
                <>
                  <span>Lihat Hasil Photostrip & Cetak HD</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Bilik foto studio aktif */
        <PhotoboothStudio
          localStream={localStream}
          remoteStream={remoteStream}
          role={role}
          roomCode={roomCode || ''}
          shotNo={session?.currentShotNo || 1}
          totalShots={session?.shotCountTarget || 4}
          tTargetServer={tTargetServer}
          offsetMs={offsetMs}
          deviceLagMs={calibration?.medianLagMs || 50}
          onCaptureCompleted={handleCaptureCompleted}
          peerName={partner?.displayName}
          isPartnerConnected={isPartnerConnected}
          selectedTemplateId={session?.templateId || 'classic_strip'}
          templateName={session?.templateId ? getTemplateById(session.templateId)?.name : 'Frame Studio'}
          onSelectTemplate={handleSelectTemplate}
          onStartSession={handleStartSession}
          onAbortCapture={handleAbortCapture}
          timeRemainingStr={timeRemainingStr}
          onExit={() => router.push('/')}
          onCopyLink={copyRoomLink}
          onShareWhatsApp={shareWhatsApp}
          justJoinedBanner={justJoinedBanner}
        />
      )}
    </div>
  );
}
