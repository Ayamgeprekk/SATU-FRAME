'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, Share2, Download, X } from 'lucide-react';

interface RoomQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomUrl?: string;
  onShareWhatsApp?: () => void;
}

export function RoomQrModal({
  isOpen,
  onClose,
  roomCode,
  roomUrl,
  onShareWhatsApp,
}: RoomQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const effectiveUrl =
    roomUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/room/${roomCode}`
      : '');

  useEffect(() => {
    if (!isOpen || !effectiveUrl) return;

    let isMounted = true;
    QRCode.toDataURL(effectiveUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.warn('Gagal membuat QR Code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(effectiveUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback manual
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback manual
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `satu-frame-room-${roomCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-center shadow-2xl text-white animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Tutup dialog QR Code"
          className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition min-h-[44px] min-w-[44px]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
          <QrCode className="h-6 w-6" />
        </div>

        <h2 id="qr-modal-title" className="text-lg font-bold text-white tracking-tight">
          Scan QR Code Room
        </h2>
        <p className="mt-1 text-xs text-zinc-300">
          Arahkan kamera HP pasanganmu ke kode ini untuk langsung bergabung ke bilik foto.
        </p>

        {/* QR Canvas Container */}
        <div className="my-5 flex flex-col items-center justify-center">
          <div className="overflow-hidden rounded-2xl border-4 border-zinc-800 bg-white p-2.5 shadow-inner">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code untuk masuk ke room ${roomCode}`}
                className="h-52 w-52 object-contain"
              />
            ) : (
              <div className="flex h-52 w-52 items-center justify-center text-xs text-zinc-600">
                Menyiapkan QR Code...
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] font-mono text-teal-400 font-semibold tracking-wider uppercase">
            Kode: {roomCode}
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition min-h-[44px]"
            >
              {copiedCode ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Kode Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-zinc-400" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition min-h-[44px]"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Link Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-zinc-400" />
                  <span>Salin Link</span>
                </>
              )}
            </button>
          </div>

          {onShareWhatsApp && (
            <button
              onClick={onShareWhatsApp}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white transition shadow-lg shadow-emerald-950/40 min-h-[44px]"
            >
              <Share2 className="h-4 w-4" />
              <span>Bagikan via WhatsApp</span>
            </button>
          )}

          {qrDataUrl && (
            <button
              onClick={handleDownloadQr}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 py-2.5 text-xs font-medium text-zinc-300 hover:text-white transition min-h-[44px]"
            >
              <Download className="h-4 w-4 text-zinc-400" />
              <span>Simpan Gambar QR</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
