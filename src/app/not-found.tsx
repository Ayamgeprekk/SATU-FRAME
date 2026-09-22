import React from 'react';
import Link from 'next/link';
import { Camera, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center backdrop-blur-md shadow-photostrip-warm">
        <div className="washi-tape absolute -top-3 left-1/2 -translate-x-1/2 z-20" />

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/80 border border-zinc-700 text-teal-400">
          <Camera className="h-8 w-8" />
        </div>

        <span className="inline-block rounded-full bg-teal-500/10 border border-teal-500/30 px-3 py-1 text-xs font-mono font-semibold text-teal-300 mb-3">
          KODE 404: FRAME TIDAK DITEMUKAN
        </span>

        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide mb-2">
          Momen Terlewatkan
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
          Halaman atau room photobooth yang Anda cari sudah berpindah, kedaluwarsa, atau tidak tersedia di studio kami.
        </p>

        <Link
          href="/"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-950/50 hover:bg-teal-500 active:scale-[0.98] transition min-h-[48px]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Studio Utama</span>
        </Link>
      </div>

      <p className="mt-8 text-xs text-zinc-500">
        Satu Frame v2.1: Dua tempat, satu momen.
      </p>
    </div>
  );
}
