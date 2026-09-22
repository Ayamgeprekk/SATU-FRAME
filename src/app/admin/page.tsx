'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Users, CheckCircle2, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface FunnelData {
  landingView: number;
  createRoom: number;
  partnerJoin: number;
  deviceCheckPass: number;
  readyBoth: number;
  shotCaptured: number;
  shotDesync: number;
  paywallView: number;
  payPaid: number;
  downloadFree: number;
  downloadHd: number;
  avgDesyncMs: number;
}

interface AdminMetrics {
  totalSessions: number;
  completedSessions: number;
  paidSessions: number;
  totalRevenueIdr: number;
  completionRate: number;
  conversionRate: number;
  funnel?: FunnelData;
  recentEvents?: Array<{
    id: string;
    eventName: string;
    timestamp: number;
    sessionId?: string;
  }>;
  recentSessions: Array<{
    id: string;
    roomCode: string;
    state: string;
    tier: string;
    shotCountSaved: number;
    createdAt: number;
  }>;
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      console.warn('Failed to load admin metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Satu Frame: Dashboard Operasional</h1>
            <p className="text-xs text-zinc-400">Ringkasan aktivitas photobooth dan konversi pembayaran</p>
          </div>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 min-h-[44px]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </button>
      </header>

      {/* Primary KPI Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
            <span className="text-xs text-zinc-400">Total Sesi Room</span>
            <p className="text-2xl font-bold text-white">{metrics.totalSessions}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
            <span className="text-xs text-zinc-400">Selesai Berfoto</span>
            <p className="text-2xl font-bold text-teal-400">{metrics.completedSessions}</p>
            <span className="text-[11px] text-zinc-400">Penyelesaian: {metrics.completionRate}%</span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
            <span className="text-xs text-zinc-400">Sesi Berbayar (HD)</span>
            <p className="text-2xl font-bold text-emerald-400">{metrics.paidSessions}</p>
            <span className="text-[11px] text-zinc-400">Konversi: {metrics.conversionRate}%</span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
            <span className="text-xs text-zinc-400">Total Pendapatan</span>
            <p className="text-2xl font-bold text-white">
              Rp{metrics.totalRevenueIdr.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      )}

      {/* Funnel Telemetry */}
      {metrics?.funnel && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Funnel Konversi & Telemetri Shutter</h2>
              <p className="text-xs text-zinc-400">Perjalanan pengguna dari landing hingga unduh</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-zinc-400 block">Rata-rata Selisih Shutter</span>
              <span
                className={`text-xs font-bold ${
                  metrics.funnel.avgDesyncMs <= 50 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {metrics.funnel.avgDesyncMs} ms
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
              <span className="text-[10px] text-zinc-400 block">1. Kunjungan</span>
              <span className="text-base font-bold text-white">{metrics.funnel.landingView}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
              <span className="text-[10px] text-zinc-400 block">2. Buat Room</span>
              <span className="text-base font-bold text-white">{metrics.funnel.createRoom}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
              <span className="text-[10px] text-zinc-400 block">3. Pasangan Masuk</span>
              <span className="text-base font-bold text-white">{metrics.funnel.partnerJoin}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
              <span className="text-[10px] text-zinc-400 block">4. Siap Foto</span>
              <span className="text-base font-bold text-white">{metrics.funnel.readyBoth}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
              <span className="text-[10px] text-zinc-400 block">5. Jepretan Selesai</span>
              <span className="text-base font-bold text-white">{metrics.funnel.shotCaptured}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
              <span className="text-[10px] text-zinc-400 block">Lihat Paywall</span>
              <span className="text-base font-bold text-white">{metrics.funnel.paywallView}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
              <span className="text-[10px] text-zinc-400 block">Pembayaran HD</span>
              <span className="text-base font-bold text-emerald-400">{metrics.funnel.payPaid}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
              <span className="text-[10px] text-zinc-400 block">Unduh Gratis</span>
              <span className="text-base font-bold text-zinc-300">{metrics.funnel.downloadFree}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
              <span className="text-[10px] text-zinc-400 block">Unduh HD</span>
              <span className="text-base font-bold text-emerald-400">{metrics.funnel.downloadHd}</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5">
              <span className="text-[10px] text-zinc-400 block">Desync (&gt;100ms)</span>
              <span
                className={`text-base font-bold ${
                  metrics.funnel.shotDesync > 0 ? 'text-amber-400' : 'text-zinc-400'
                }`}
              >
                {metrics.funnel.shotDesync}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Sessions Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Daftar Sesi Terbaru</h2>
          <span className="text-xs text-zinc-400">Pembaruan otomatis berkala</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/50 text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Kode Room</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Foto Tersimpan</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Waktu Pembuatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {metrics?.recentSessions && metrics.recentSessions.length > 0 ? (
                metrics.recentSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-mono font-bold text-teal-400">{s.roomCode}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                        {s.state}
                      </span>
                    </td>
                    <td className="px-4 py-3">{s.shotCountSaved} / 4</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          s.tier === 'paid_hd'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {s.tier === 'paid_hd' ? 'HD' : 'Gratis'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(s.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                    Belum ada sesi aktif saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
