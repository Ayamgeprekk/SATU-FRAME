'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar, Heart, ArrowLeft, Download, Plus, Search, RefreshCw, Clock } from 'lucide-react';
import Link from 'next/link';
import { CoupleTimeline } from '@/types/timeline';

function TimelineContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const idParam = searchParams.get('id');
  const emailParam = searchParams.get('email');

  const [timeline, setTimeline] = useState<CoupleTimeline | null>(null);
  const [emailInput, setEmailInput] = useState(emailParam || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);

  const fetchTimeline = async (id?: string, email?: string) => {
    if (!id && !email) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const url = id ? `/api/timeline?id=${encodeURIComponent(id)}` : `/api/timeline?email=${encodeURIComponent(email!)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline);
      } else {
        setErrorMsg('Linimasa tidak ditemukan. Masukkan email yang Anda daftarkan saat berfoto.');
        setTimeline(null);
      }
    } catch {
      setErrorMsg('Gagal memuat linimasa. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idParam || emailParam) {
      fetchTimeline(idParam || undefined, emailParam || undefined);
    }
  }, [idParam, emailParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    fetchTimeline(undefined, emailInput.trim());
  };

  // Calculations for Kalender Momen
  const calculateDaysTogether = (anniversaryDateStr: string): number => {
    if (!anniversaryDateStr) return 0;
    const start = new Date(anniversaryDateStr).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - start);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const calculateDaysToNextMonthsary = (anniversaryDateStr: string): number => {
    if (!anniversaryDateStr) return 0;
    const anniv = new Date(anniversaryDateStr);
    const now = new Date();

    const targetDay = anniv.getDate();
    let nextMonthsary = new Date(now.getFullYear(), now.getMonth(), targetDay);

    if (nextMonthsary.getTime() <= now.getTime()) {
      nextMonthsary = new Date(now.getFullYear(), now.getMonth() + 1, targetDay);
    }

    const diff = nextMonthsary.getTime() - now.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleStartSessionWithQuota = async () => {
    if (!timeline || timeline.quotaRemaining <= 0) return;
    setCreatingSession(true);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'romantic_moment',
          timelineId: timeline.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.roomCode) {
        localStorage.setItem(`sf_token_${data.session.id}`, data.creatorToken);
        localStorage.setItem(`sf_role_${data.session.id}`, 'creator');
        router.push(`/room/${data.roomCode}`);
      } else {
        alert(data.error || 'Gagal memulai sesi baru.');
      }
    } catch {
      alert('Koneksi gagal. Silakan coba kembali.');
    } finally {
      setCreatingSession(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between pb-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition min-h-[44px] min-w-[44px]"
            aria-label="Kembali ke Beranda"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">Linimasa Memori & Kalender Momen</h1>
            <p className="text-xs sm:text-sm text-zinc-400">Arsip photobooth dan momen spesial berdua yang abadi</p>
          </div>
        </div>

        <Link
          href="/create"
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-teal-500 active:scale-95 transition min-h-[44px] shadow-sm shadow-teal-950/50"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Mulai Sesi Baru</span>
          <span className="sm:hidden">Baru</span>
        </Link>
      </header>

      {/* Lookup Form if no timeline is selected */}
      {!timeline && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 space-y-5 max-w-xl mx-auto backdrop-blur-sm">
          <div className="space-y-1.5 text-center sm:text-left">
            <h2 className="text-base sm:text-lg font-bold text-white">Buka Linimasa Memori Anda</h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Masukkan alamat email yang didaftarkan saat menyimpan hasil photobooth atau mengaktifkan paket sesi.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              placeholder="nama@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-base md:text-sm text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none min-h-[44px]"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-500 active:scale-95 disabled:opacity-50 min-h-[44px] transition shadow-md shadow-teal-950/40"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>Buka Linimasa</span>
            </button>
          </form>

          {errorMsg && (
            <div className="rounded-xl border border-red-900/80 bg-red-950/40 p-3.5 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 text-xs text-zinc-400 text-center sm:text-left">
            Email demo yang dapat dicoba langsung: <span className="font-mono text-zinc-300">rara.dimas@example.com</span>
          </div>
        </div>
      )}

      {/* Couple Memory Dashboard */}
      {timeline && (
        <div className="space-y-8">
          {/* Couple Banner */}
          <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {timeline.partnerName1} & {timeline.partnerName2}
                  </span>
                  <Heart className="h-6 w-6 fill-amber-500 text-amber-500 shrink-0" />
                </div>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Bersama sejak{' '}
                  <span className="text-zinc-200 font-medium">
                    {new Date(timeline.anniversaryDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              </div>

              {/* Kalender Momen Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-center">
                  <span className="text-[10px] sm:text-xs uppercase font-semibold text-zinc-400 block">Hari Bersama</span>
                  <span className="text-xl sm:text-2xl font-bold text-amber-400">
                    {calculateDaysTogether(timeline.anniversaryDate)}
                  </span>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-center">
                  <span className="text-[10px] sm:text-xs uppercase font-semibold text-zinc-400 block">Monthsary Berikutnya</span>
                  <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                    {calculateDaysToNextMonthsary(timeline.anniversaryDate)} hari
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-center">
                  <span className="text-[10px] sm:text-xs uppercase font-semibold text-zinc-400 block">Total Momen</span>
                  <span className="text-xl sm:text-2xl font-bold text-white">
                    {timeline.moments.length} Strip
                  </span>
                </div>
              </div>
            </div>

            {/* Package Quota Notice */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-zinc-800/80">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-zinc-300">
                  Sisa Kuota Sesi:{' '}
                  <strong className="text-white font-bold">{timeline.quotaRemaining} Sesi</strong> (Paket{' '}
                  {timeline.packageTier === '3_sessions' ? '3 Sesi' : '1 Sesi'})
                </span>
              </div>

              {timeline.quotaRemaining > 0 && (
                <button
                  onClick={handleStartSessionWithQuota}
                  disabled={creatingSession}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-emerald-500 active:scale-95 disabled:opacity-50 min-h-[44px] transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>{creatingSession ? 'Membuka Studio...' : 'Gunakan 1 Kuota Foto'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Chronological Photostrip Moments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                Galeri Photostrip ({timeline.moments.length})
              </h2>
              <span className="text-xs text-zinc-400">Momen terbaru di bagian atas</span>
            </div>

            {timeline.moments.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center space-y-3">
                <Calendar className="h-10 w-10 mx-auto text-zinc-600" />
                <p className="text-sm font-semibold text-zinc-300">Belum ada momen foto yang tersimpan</p>
                <p className="text-xs text-zinc-400">Mulai sesi foto pertama berdua dan simpan ke linimasa memori ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {timeline.moments.map((moment) => (
                  <div
                    key={moment.id}
                    className="group rounded-2xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 p-4 space-y-3.5 flex flex-col justify-between transition shadow-md"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-bold text-white truncate">{moment.momentTitle}</span>
                        <span className="text-[11px] text-zinc-400 shrink-0">
                          {new Date(moment.capturedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {moment.note && (
                        <p className="text-xs text-zinc-400 italic line-clamp-2">"{moment.note}"</p>
                      )}
                    </div>

                    {/* Thumbnail / Link */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 flex items-center justify-center min-h-[260px] group-hover:border-zinc-700 transition">
                      <img
                        src={`/api/results/${moment.resultToken}?format=strip`}
                        alt={moment.momentTitle}
                        className="max-h-64 w-auto object-contain rounded-md shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="240" fill="%2327272a"><rect width="100%" height="100%"/><text x="50%" y="50%" fill="%2371717a" dominant-baseline="middle" text-anchor="middle" font-size="12">Photostrip</text></svg>';
                        }}
                      />
                    </div>

                    <div className="pt-1">
                      <Link
                        href={`/r/${moment.resultToken}`}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 py-3 text-center text-xs font-semibold text-zinc-100 hover:text-white min-h-[44px] flex items-center justify-center transition"
                      >
                        Buka Hasil & Format
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function TimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center text-xs">
          Memuat linimasa memori...
        </div>
      }
    >
      <TimelineContent />
    </Suspense>
  );
}
