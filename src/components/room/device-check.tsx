'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { calibrateDeviceShutterLag, CalibrationResult } from '@/lib/sync/shutter-calibrator';

interface DeviceCheckProps {
  displayName: string;
  peerName?: string;
  onReady: (stream: MediaStream, calibration: CalibrationResult, consentAudit?: { consentVersion: string; consentedAt: number; scope: string }) => void;
  isPeerReady?: boolean;
}

export function DeviceCheck({ displayName, peerName, onReady, isPeerReady }: DeviceCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibration, setCalibration] = useState<CalibrationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Request camera access
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function initCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false, // Audio not needed for photobooth capture
        });

        activeStream = mediaStream;
        setStream(mediaStream);
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error('Camera error:', err);
        setHasCameraPermission(false);
        if (err.name === 'NotAllowedError') {
          setErrorMessage('Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.');
        } else if (err.name === 'NotReadableError') {
          setErrorMessage('Kamera sedang dipakai aplikasi lain. Tutup aplikasi lain terlebih dahulu.');
        } else {
          setErrorMessage('Gagal membuka kamera: ' + (err.message || 'Error tidak diketahui'));
        }
      }
    }

    initCamera();

    return () => {
      if (activeStream) {
        // Stream will be handed over to parent on ready, don't stop tracks if handed over
      }
    };
  }, []);

  // Run automatic shutter calibration once video is playing (5 test rounds)
  const handleVideoLoaded = async () => {
    if (!videoRef.current || calibration || isCalibrating) return;

    setIsCalibrating(true);
    try {
      const result = await calibrateDeviceShutterLag(videoRef.current, 5);
      setCalibration(result);
    } catch (err) {
      console.warn('Calibration error:', err);
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleConfirmReady = () => {
    if (!stream || !calibration || !consentAgreed) return;
    const consentAudit = {
      consentVersion: 'v2.2',
      consentedAt: Date.now(),
      scope: 'biometric_portrait_uu_pdp_27_2022',
    };
    onReady(stream, calibration, consentAudit);
  };

  return (
    <div className="flex w-full max-w-md md:max-w-xl flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 text-center">
        <h2 className="text-xl md:text-2xl font-bold text-white">Cek Kamera & Kesiapan</h2>
        <p className="text-xs md:text-sm text-zinc-400">
          Pastikan wajah terlihat jelas dan pencahayaan cukup sebelum memulai.
        </p>
      </div>

      {/* Camera Preview Viewfinder */}
      <div className="relative mb-5 aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-zinc-700/60 bg-black shadow-inner">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedData={handleVideoLoaded}
          className="h-full w-full object-cover -scale-x-100" // Mirror local selfie
        />

        {hasCameraPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="mb-2 h-10 w-10 text-red-500" />
            <p className="text-sm font-semibold text-white">{errorMessage}</p>
          </div>
        )}

        {isCalibrating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <Zap className="mb-2 h-8 w-8 animate-bounce text-amber-400" />
            <p className="text-xs font-medium text-amber-200">Mengukur responsivitas shutter kamera...</p>
          </div>
        )}

        {/* Live Calibration Badge */}
        {calibration && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1 text-[11px] text-zinc-300 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            Lag: {calibration.medianLagMs}ms • {calibration.deviceClass} ({calibration.activeCaptureMode})
          </div>
        )}
      </div>

      {/* Two-Step Biometric PDP Consent (PRD §14.2 & UU No. 27/2022 Pasal 4(2)) */}
      <div className="mb-5 w-full space-y-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition hover:border-zinc-700">
          <input
            type="checkbox"
            checked={consentAgreed}
            onChange={(e) => setConsentAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-700 text-teal-600 focus:ring-teal-600 focus:ring-offset-0"
          />
          <div className="text-xs text-zinc-300 leading-relaxed">
            <span className="font-semibold text-white">Persetujuan Data Biometrik:</span> Saya setuju foto wajah diproses sesuai UU PDP No. 27/2022 Pasal 4(2) untuk digabungkan bersama foto{' '}
            <span className="text-amber-400 font-semibold">{peerName || 'pasangan'}</span>. Foto disimpan maksimal 24 jam untuk tamu lalu dihapus permanen, serta tidak digunakan untuk pelatihan AI maupun periklanan.
          </div>
        </label>

        {/* Step 2: Detailed PDP Rights Transparency Toggle */}
        <details className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 text-[11px] text-zinc-400">
          <summary className="cursor-pointer font-medium text-teal-400 hover:text-teal-300 select-none">
            Pelajari Detail Perlindungan Data & Hak PDP Anda (UU No. 27/2022)
          </summary>
          <div className="mt-2 space-y-1.5 text-zinc-400 border-t border-zinc-800/60 pt-2">
            <p>• <strong>Kategori Data:</strong> Foto wajah dikategorikan sebagai Data Sensitif berdasarkan UU PDP Pasal 4 ayat (2).</p>
            <p>• <strong>Tujuan Pemrosesan:</strong> Pembuatan strip photobooth berdua secara real-time dan penyediaan unduhan resmi, tanpa pelatihan AI atau iklan.</p>
            <p>• <strong>Pihak Ketiga Resmi:</strong> Penyimpanan cloud terenkripsi (Cloudflare R2) dan gateway pembayaran terlisensi BI (Midtrans/Xendit).</p>
            <p>• <strong>Hak Akses & Penghapusan:</strong> Tombol hapus permanen data sesi tersedia langsung di halaman hasil kapan pun (SLA maksimal 72 jam).</p>
          </div>
        </details>
      </div>

      {/* Peer Status Pill */}
      <div className="mb-4 flex items-center gap-2 text-xs text-zinc-400">
        <span
          className={`h-2 w-2 rounded-full ${
            isPeerReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          }`}
        />
        {isPeerReady
          ? `${peerName || 'Pasanganmu'} sudah siap!`
          : `Menunggu ${peerName || 'pasanganmu'} siap...`}
      </div>

      {/* Ready Button */}
      <button
        onClick={handleConfirmReady}
        disabled={!hasCameraPermission || !calibration || !consentAgreed}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 py-4 font-semibold text-white shadow-lg shadow-teal-600/30 transition hover:bg-teal-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 min-h-[48px]"
      >
        <Check className="h-5 w-5" />
        Saya Siap Berfoto!
      </button>
    </div>
  );
}
