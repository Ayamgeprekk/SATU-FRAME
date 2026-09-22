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

  // References & P2P DataChannel
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const chunkReassemblerRef = useRef<Map<string, { total: number; chunks: string[] }>>(new Map());
  const completedShotsRef = useRef<Map<number, Set<string>>>(new Map());
  const [isP2PConnected, setIsP2PConnected] = useState(false);
  const timeSyncRef = useRef<TimeSyncClient | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

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
        if (Array.isArray(data.participants)) {
          setParticipants(data.participants);
        }

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

  // WebRTC signaling dispatcher supporting WebSocket with HTTP fallback for Vercel Serverless
  const sendSignal = useCallback(
    async (signal: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'WEBRTC_SIGNAL',
            payload: { signal },
          })
        );
        return;
      }

      if (session?.id && participantId) {
        try {
          await fetch(`/api/sessions/${session.id}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participantId,
              action: 'SIGNAL',
              signal,
            }),
          });
        } catch (e) {
          console.warn('HTTP sendSignal error:', e);
        }
      }
    },
    [session?.id, participantId]
  );

  const createOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || role !== 'creator') return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ offer });
    } catch (e) {
      console.warn('createOffer error:', e);
    }
  }, [role, sendSignal]);

  const handleWebRtcSignal = useCallback(
    async (signal: any) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (signal.offer) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ answer });
        } else if (signal.answer) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.warn('WebRTC signal handling error:', err);
      }
    },
    [sendSignal]
  );

  // P2P DataChannel dispatcher for sub-5ms realtime synchronizations
  const sendP2PMessage = useCallback((type: string, payload: any = {}) => {
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== 'open') return false;

    try {
      const json = JSON.stringify({ type, ...payload });
      const CHUNK_SIZE = 15 * 1024; // 15 KB safe chunking across all mobile browsers

      if (json.length <= CHUNK_SIZE) {
        dc.send(json);
      } else {
        const msgId = Math.random().toString(36).substring(2, 9);
        const totalChunks = Math.ceil(json.length / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const chunk = json.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          dc.send(
            JSON.stringify({
              type: 'CHUNK',
              msgId,
              index: i,
              total: totalChunks,
              chunk,
            })
          );
        }
      }
      return true;
    } catch (err) {
      console.warn('sendP2PMessage error:', err);
      return false;
    }
  }, []);

  const setupDataChannel = useCallback(
    (dc: RTCDataChannel) => {
      dataChannelRef.current = dc;

      dc.onopen = () => {
        setIsP2PConnected(true);
      };

      dc.onclose = () => {
        setIsP2PConnected(false);
      };

      dc.onerror = (e) => {
        console.warn('P2P DataChannel error:', e);
      };

      dc.onmessage = async (event) => {
        try {
          const raw = JSON.parse(event.data);
          let data = raw;

          if (raw.type === 'CHUNK') {
            let entry = chunkReassemblerRef.current.get(raw.msgId);
            if (!entry) {
              entry = { total: raw.total, chunks: [] };
              chunkReassemblerRef.current.set(raw.msgId, entry);
            }
            entry.chunks[raw.index] = raw.chunk;
            if (entry.chunks.filter(Boolean).length === entry.total) {
              const fullJson = entry.chunks.join('');
              chunkReassemblerRef.current.delete(raw.msgId);
              data = JSON.parse(fullJson);
            } else {
              return;
            }
          }

          switch (data.type) {
            case 'START_COUNTDOWN': {
              const durationMs = data.durationMs || 3000;
              setTTargetServer(Date.now() + durationMs);
              break;
            }

            case 'ABORT_COUNTDOWN': {
              setTTargetServer(undefined);
              break;
            }

            case 'P2P_PHOTO_SHARE': {
              if (data.blobBase64 && data.shotNo && session?.id) {
                const res = await fetch(data.blobBase64);
                const peerBlob = await res.blob();
                const senderId = data.participantId || (role === 'creator' ? 'partner' : 'creator');
                await localShotStorage.saveShot(session.id, data.shotNo, senderId, peerBlob);
              }
              break;
            }

            case 'SHOT_COMPLETED': {
              const sNo = data.shotNo;
              let set = completedShotsRef.current.get(sNo);
              if (!set) {
                set = new Set();
                completedShotsRef.current.set(sNo, set);
              }
              set.add(data.participantId);

              const reqCount = participants.length >= 2 ? 2 : 1;
              if (set.size >= reqCount) {
                const nextNo = sNo + 1;
                if (nextNo > (session?.shotCountTarget || 4)) {
                  setSession((prev) => (prev ? { ...prev, state: 'REVIEW', shotCountSaved: 4 } : null));
                } else {
                  setSession((prev) =>
                    prev
                      ? {
                          ...prev,
                          currentShotNo: nextNo,
                          shotCountSaved: sNo,
                          state: 'SHOT_SAVED',
                        }
                      : null
                  );
                }
              }
              break;
            }

            case 'ADVANCE_SHOT': {
              const nextNo = data.nextShotNo;
              if (nextNo > (session?.shotCountTarget || 4)) {
                setSession((prev) => (prev ? { ...prev, state: 'REVIEW', shotCountSaved: 4 } : null));
              } else {
                setSession((prev) =>
                  prev
                    ? {
                        ...prev,
                        currentShotNo: nextNo,
                        shotCountSaved: data.shotNo,
                        state: 'SHOT_SAVED',
                      }
                    : null
                );
              }
              break;
            }

            case 'RETAKE_REQUEST': {
              setSession((prev) =>
                prev
                  ? {
                      ...prev,
                      currentShotNo: data.shotNo,
                      state: 'READY',
                    }
                  : null
              );
              break;
            }
          }
        } catch (err) {
          console.warn('Error handling P2P message:', err);
        }
      };
    },
    [participants.length, role, session?.id, session?.shotCountTarget]
  );

  // WebRTC PeerConnection initialization
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

      // Setup DataChannel on creator side
      if (role === 'creator') {
        try {
          const dc = pc.createDataChannel('photobooth-sync', { ordered: true });
          setupDataChannel(dc);
        } catch (e) {
          console.warn('Failed to create DataChannel:', e);
        }
      }

      // Listen for incoming DataChannel on partner side
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };

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
        if (event.candidate) {
          sendSignal({ candidate: event.candidate });
        }
      };

      // If creator and partner already present, create offer immediately
      if (role === 'creator' && participants.length >= 2) {
        createOffer();
      }
    },
    [role, participants.length, sendSignal, createOffer, setupDataChannel]
  );

  // Start WebRTC when localStream is ready
  useEffect(() => {
    if (localStream) {
      initWebRtc(localStream);
    }
  }, [localStream, initWebRtc]);

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
      setIsWsConnected(true);
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

    ws.onerror = () => {
      setIsWsConnected(false);
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
      setIsWsConnected(false);
      timeSync.stopPeriodicSync();
    };

    return () => {
      ws.close();
      timeSync.stopPeriodicSync();
    };
  }, [session?.id, participantId, role, createOffer, handleWebRtcSignal]);

  // HTTP Polling Fallback & Heartbeat (Active on Vercel Serverless or when WS disconnects)
  useEffect(() => {
    if (!session?.id || !participantId) return;

    let isPolling = true;

    async function syncPoll() {
      const intervalMs = isWsConnected ? 4000 : 1200;

      try {
        const res = await fetch(`/api/sessions/${session?.id}/sync?participantId=${participantId}`);
        if (res.ok) {
          const data = await res.json();
          if (!isPolling) return;

          if (data.session) setSession(data.session);
          if (Array.isArray(data.participants)) {
            setParticipants(data.participants);
            if (
              role === 'creator' &&
              data.participants.length >= 2 &&
              !remoteStream &&
              !peerConnectionRef.current?.remoteDescription
            ) {
              createOffer();
            }
          }

          if (Array.isArray(data.signals) && data.signals.length > 0) {
            for (const sig of data.signals) {
              handleWebRtcSignal(sig);
            }
          }

          if (data.scheduledCapture?.tTargetServer) {
            if (Date.now() < data.scheduledCapture.tTargetServer + 500) {
              setTTargetServer(data.scheduledCapture.tTargetServer);
            } else {
              setTTargetServer(undefined);
            }
          } else if (data.scheduledCapture === null) {
            setTTargetServer(undefined);
          }
        }
      } catch {}

      if (isPolling) {
        pollingTimerRef.current = setTimeout(syncPoll, intervalMs);
      }
    }

    syncPoll();

    return () => {
      isPolling = false;
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    };
  }, [session?.id, participantId, isWsConnected, role, remoteStream, createOffer, handleWebRtcSignal]);

  // Partner Join Notification Banner
  useEffect(() => {
    if (participants.length >= 2 && prevPartsLenRef.current < 2) {
      setJustJoinedBanner(true);
      const timer = setTimeout(() => setJustJoinedBanner(false), 5000);
      return () => clearTimeout(timer);
    }
    prevPartsLenRef.current = participants.length;
  }, [participants.length]);

  // Countdown timer for remaining session time
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

  // Handle Template Selection
  const handleSelectTemplate = async (templateId: string) => {
    if (!session) return;
    setSession((prev) => (prev ? { ...prev, templateId } : null));

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UPDATE_TEMPLATE',
          payload: { sessionId: session.id, templateId },
        })
      );
    } else {
      try {
        await fetch(`/api/sessions/${session.id}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            action: 'SELECT_TEMPLATE',
            templateId,
          }),
        });
      } catch {}
    }
  };

  // Handle Shutter Trigger (Triggers Instant Realtime 3-2-1 Countdown)
  const handleStartSession = async () => {
    if (!session) return;
    const shotNo = session.currentShotNo || 1;
    const durationMs = 3000;
    const targetTime = Date.now() + durationMs;

    // 1. Instantly notify peer via P2P DataChannel (< 5ms latency!)
    sendP2PMessage('START_COUNTDOWN', {
      shotNo,
      durationMs,
    });

    // 2. Start local countdown immediately
    setTTargetServer(targetTime);

    // 3. Fallback: Notify server via HTTP sync in background
    try {
      fetch(`/api/sessions/${session.id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          action: 'SCHEDULE_CAPTURE',
          shotNo,
          delayMs: durationMs,
        }),
      }).catch(() => {});
    } catch {}
  };

  // 9. Handle Photo Shot Captured (IndexedDB Write-Ahead + Commit)
  const handleCaptureCompleted = async (blob: Blob, tFrameServerEst: number) => {
    if (!session) return;
    const shotNo = session.currentShotNo;
    setTTargetServer(undefined);

    trackEvent('shot_captured', {
      sessionId: session.id,
      participantId,
      properties: { shotNo },
    });

    // Step A: Write-Ahead to local IndexedDB (PRD §11.5)
    await localShotStorage.saveShot(session.id, shotNo, participantId, blob);

    // Step B: Send photo directly to peer via P2P DataChannel
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        sendP2PMessage('P2P_PHOTO_SHARE', {
          shotNo,
          participantId,
          role,
          blobBase64: base64,
        });
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.warn('P2P photo share error:', e);
    }

    // Step C: Mark local shot completed and notify peer
    let set = completedShotsRef.current.get(shotNo);
    if (!set) {
      set = new Set();
      completedShotsRef.current.set(shotNo, set);
    }
    set.add(participantId);

    sendP2PMessage('SHOT_COMPLETED', {
      shotNo,
      participantId,
      role,
    });

    // Check if both participants have finished this shot
    const requiredCount = participants.length >= 2 ? 2 : 1;
    if (set.size >= requiredCount) {
      const nextShotNo = shotNo + 1;
      sendP2PMessage('ADVANCE_SHOT', {
        shotNo,
        nextShotNo,
      });

      if (nextShotNo > (session.shotCountTarget || 4)) {
        setSession((prev) => (prev ? { ...prev, state: 'REVIEW', shotCountSaved: 4 } : null));
      } else {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                currentShotNo: nextShotNo,
                shotCountSaved: shotNo,
                state: 'SHOT_SAVED',
              }
            : null
        );
      }
    }

    // Step D: Background incremental upload to server for persistence
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
          setSession((prev) => {
            if (!prev) return data.session;
            return {
              ...prev,
              ...data.session,
              currentShotNo: Math.max(prev.currentShotNo, data.session.currentShotNo),
              state: data.session.state === 'REVIEW' || prev.state === 'REVIEW' ? 'REVIEW' : data.session.state,
            };
          });
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
        const partnerPart = participants.find((p) => p.role === 'partner');
        const partnerId = partnerPart?.id;

        for (let i = 1; i <= 4; i++) {
          // My shot
          const local = await localShotStorage.getShot(session.id, i, participantId);
          if (local) {
            const slotIdx = participants.length >= 2
              ? (i - 1) * 2 + (role === 'creator' ? 0 : 1)
              : (i - 1);
            photoInputs.push({ slotIndex: slotIdx, blob: local.blob });
          }

          // Partner shot
          if (partnerId) {
            const peerShot = await localShotStorage.getShot(session.id, i, partnerId);
            if (peerShot) {
              const peerSlot = (i - 1) * 2 + (role === 'creator' ? 1 : 0);
              photoInputs.push({ slotIndex: peerSlot, blob: peerShot.blob });
            }
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
    sendP2PMessage('RETAKE_REQUEST', { shotNo });
    setSession((prev) =>
      prev
        ? {
            ...prev,
            currentShotNo: shotNo,
            state: 'READY',
          }
        : null
    );
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'RETAKE_REQUEST',
          payload: { shotNo },
        })
      );
    }
  };

  const handleAbortCapture = async (reason: string) => {
    setTTargetServer(undefined);
    sendP2PMessage('ABORT_COUNTDOWN', { reason });
    if (!session) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CAPTURE_ABORT',
          payload: { sessionId: session.id, participantId, reason },
        })
      );
    } else {
      try {
        await fetch(`/api/sessions/${session.id}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            action: 'ABORT_CAPTURE',
            reason,
          }),
        });
      } catch {}
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
          isP2PConnected={isP2PConnected}
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
