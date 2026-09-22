'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

export function ScreenGuard() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    // 1. Wake Lock API (PRD §13.4): keep screen on during photobooth session
    let wakeLock: any = null;

    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch {
          // Wake lock may fail if battery saver is on
        }
      }
    }

    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 2. Mobile Orientation Detection (PRD §13.4): Portrait lock recommendation
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        const isMobileScreen = window.innerWidth <= 768;
        const isLandscapeMode = window.innerWidth > window.innerHeight;
        setIsLandscape(isMobileScreen && isLandscapeMode);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      if (wakeLock) {
        try {
          wakeLock.release();
        } catch {}
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isLandscape) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 text-center text-white backdrop-blur-md">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-700 text-teal-400 mb-4 animate-bounce">
        <Smartphone className="h-8 w-8 rotate-90" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Putar Layar ke Posisi Tegak</h3>
      <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
        Satu Frame dioptimalkan untuk posisi tegak (portrait) agar tampilan dua kamera pas di layar ponsel Anda.
      </p>
    </div>
  );
}
