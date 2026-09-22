'use client';

import React, { useEffect, useState } from 'react';
import { Copy, ExternalLink, AlertTriangle, Check } from 'lucide-react';

export function InAppBrowserInterceptor() {
  const [isInApp, setIsInApp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);

    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');

    // In-app browser detection patterns (PRD §13.2)
    const inAppPatterns = [
      /Instagram/i,
      /FBAN|FBAV/i, // Facebook
      /Line\//i,
      /TikTok|musical_ly/i,
      /Twitter|TwitterAndroid/i,
      /MicroMessenger/i, // WeChat
      /; wv\)/i, // Android WebView
    ];

    const detectedInApp = inAppPatterns.some((pattern) => pattern.test(ua));
    const lacksMediaDevices = !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia;

    if (detectedInApp || lacksMediaDevices) {
      setIsInApp(true);
    }
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenBrowser = () => {
    const currentUrl = window.location.href;
    if (platform === 'android') {
      // Android Chrome Intent
      const cleanUrl = currentUrl.replace(/^https?:\/\//, '');
      window.location.href = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    } else {
      // iOS doesn't allow direct intent, user needs to tap three dots
      handleCopyLink();
    }
  };

  if (!isInApp || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-teal-500/30 bg-zinc-900 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-400">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h3 className="mb-2 text-xl font-bold text-white">Buka di Browser Asli</h3>
        <p className="mb-6 text-sm leading-relaxed text-zinc-300">
          Aplikasi media sosial (Instagram, TikTok, WA) sering membatasi akses kamera.
          Untuk hasil terbaik, silakan buka halaman ini di <strong className="text-white">Chrome atau Safari</strong>.
        </p>

        <div className="space-y-3">
          {platform === 'android' && (
            <button
              onClick={handleOpenBrowser}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 font-semibold text-white shadow-lg shadow-teal-500/25 transition active:scale-95"
            >
              <ExternalLink className="h-4 w-4" />
              Buka di Chrome
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 py-3.5 font-medium text-zinc-200 transition hover:bg-zinc-800 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">Link Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Salin Link Room
              </>
            )}
          </button>

          {platform === 'ios' && (
            <div className="rounded-xl bg-zinc-800/40 p-3 text-xs text-zinc-300">
              <strong className="text-white">Panduan Safari iPhone:</strong> Ketuk ikon <span className="text-white font-mono font-bold">•••</span> di pojok layar, lalu pilih <span className="text-white font-semibold">&ldquo;Buka di Safari&rdquo;</span>.
            </div>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="w-full text-center text-xs text-zinc-400 hover:text-white transition py-2.5 min-h-[44px] flex items-center justify-center underline underline-offset-4"
          >
            Lanjutkan di peramban ini
          </button>
        </div>
      </div>
    </div>
  );
}
