'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, Check, RefreshCw, Copy, ExternalLink, Trash2, Layout, Heart, Calendar, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';
import { localShotStorage } from '@/lib/storage/indexeddb-storage';

interface OrderInfo {
  id: string;
  amountIdr: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  qrCodeUrl?: string;
  deeplinkUrl?: string;
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const resultToken = params.token as string;

  const [photostripUrl, setPhotostripUrl] = useState<string | null>(null);
  const [isPaidHd, setIsPaidHd] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'strip' | 'story' | 'feed'>('strip');
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderInfo | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<'1_session' | '3_sessions'>('1_session');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormatSwitching, setIsFormatSwitching] = useState(false);

  // Timeline claiming states (PRD §4 Pillar C & E, §5.1, §6.2)
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const [timelineEmail, setTimelineEmail] = useState('');
  const [partnerName1, setPartnerName1] = useState('');
  const [partnerName2, setPartnerName2] = useState('');
  const [annivDate, setAnnivDate] = useState('');
  const [momentNote, setMomentNote] = useState('');
  const [isClaimingTimeline, setIsClaimingTimeline] = useState(false);
  const [timelineSuccessUrl, setTimelineSuccessUrl] = useState<string | null>(null);

  const handleClaimTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineEmail.trim()) return;
    setIsClaimingTimeline(true);

    try {
      const res = await fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: timelineEmail.trim(),
          partnerName1: partnerName1.trim() || 'Kamu',
          partnerName2: partnerName2.trim() || 'Pasangan',
          anniversaryDate: annivDate || new Date().toISOString().split('T')[0],
          resultToken,
          packageTier: selectedPackage,
          note: momentNote.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTimelineSuccessUrl(data.timelineUrl);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      } else {
        alert('Gagal menyimpan ke linimasa.');
      }
    } catch {
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setIsClaimingTimeline(false);
    }
  };

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load session photostrip data
  const fetchResultData = useCallback(
    async (format = selectedFormat) => {
      try {
        // Instant visual feedback from local IndexedDB cache if available
        const localBlob = await localShotStorage.getComposedStrip(resultToken, format);
        if (localBlob) {
          const localUrl = URL.createObjectURL(localBlob);
          setPhotostripUrl(localUrl);
          setIsLoading(false);
        }

        const res = await fetch(`/api/results/${resultToken}?format=${format}`);
        if (res.ok) {
          const data = await res.json();
          if (data.photostripUrl) {
            setPhotostripUrl(data.photostripUrl);
          }
          setIsPaidHd(data.tier === 'paid_hd');
          if (data.session?.id) setSessionId(data.session.id);
        }
      } catch {
        console.warn('Failed to load result data');
      } finally {
        setIsLoading(false);
        setIsFormatSwitching(false);
      }
    },
    [resultToken, selectedFormat]
  );

  useEffect(() => {
    fetchResultData();
  }, [fetchResultData]);

  const handleFormatChange = (newFormat: 'strip' | 'story' | 'feed') => {
    if (newFormat === selectedFormat) return;
    setSelectedFormat(newFormat);
    setIsFormatSwitching(true);
    fetchResultData(newFormat);
  };

  // Visibility and payment verification
  const checkPaymentStatus = useCallback(async () => {
    if (!activeOrder || activeOrder.status === 'PAID') return;

    try {
      const res = await fetch(`/api/orders/${activeOrder.id}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'PAID') {
          setActiveOrder((prev) => (prev ? { ...prev, status: 'PAID' } : null));
          setIsPaidHd(true);
          setShowPayModal(false);
          trackEvent('pay_paid', {
            sessionId: sessionId || undefined,
            properties: { orderId: activeOrder.id },
          });
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          fetchResultData();
        }
      }
    } catch {}
  }, [activeOrder, fetchResultData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) checkPaymentStatus();
    };
    const handlePageShow = () => checkPaymentStatus();
    const handleFocus = () => checkPaymentStatus();
    const handleOnline = () => checkPaymentStatus();

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkPaymentStatus]);

  // Periodic polling for pending transactions
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'PENDING') {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      return;
    }

    pollingIntervalRef.current = setInterval(() => {
      checkPaymentStatus();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [activeOrder, checkPaymentStatus]);

  // Initiate QRIS payment order
  const [paymentAttempt, setPaymentAttempt] = useState(1);

  const handleInitiatePayment = async () => {
    setIsCreatingOrder(true);
    try {
      const idempotencyKey = `${resultToken}:${selectedPackage}:${paymentAttempt}`;
      const clientReturnUrl = `${window.location.origin}/pay/return?t=${resultToken}`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultToken,
          packageId: selectedPackage,
          idempotencyKey,
          clientReturnUrl,
        }),
      });

      if (res.ok) {
        const orderData = await res.json();
        setActiveOrder(orderData);
      }
    } catch (err) {
      alert('Gagal membuat pesanan pembayaran.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Local development payment simulation
  const handleSimulateSuccess = async () => {
    if (!activeOrder) return;
    try {
      const res = await fetch('/api/webhooks/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.id,
          status: 'PAID',
        }),
      });

      if (res.ok) {
        checkPaymentStatus();
      }
    } catch {}
  };

  // P1-08: Deep link intent with 3.5s timeout & visibility check
  const [deepLinkWaiting, setDeepLinkWaiting] = useState(false);
  const [deepLinkFailed, setDeepLinkFailed] = useState(false);

  const handleOpenDeepLink = (url: string) => {
    setDeepLinkWaiting(true);
    setDeepLinkFailed(false);
    window.location.href = url;

    setTimeout(() => {
      setDeepLinkWaiting(false);
      if (!document.hidden) {
        setDeepLinkFailed(true);
      }
    }, 3500);
  };

  // P1-09: iOS Safari compliant QR share / save
  const handleShareOrSaveQr = async (qrDataUrl: string) => {
    try {
      const blob = await (await fetch(qrDataUrl)).blob();
      const file = new File([blob], 'qris-satu-frame.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'QRIS Pembayaran Satu Frame',
          text: 'Scan QRIS ini di aplikasi e-wallet pilihanmu',
          files: [file],
        });
        return;
      }
    } catch {}

    // Fallback standard download
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'qris-satu-frame.png';
    link.click();
  };

  // P1-10: Explicit cancel & rotate attempt for clean idempotency
  const handleCancelAndChangeMethod = () => {
    setActiveOrder(null);
    setPaymentAttempt((prev) => prev + 1);
    setDeepLinkFailed(false);
    setDeepLinkWaiting(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownload = () => {
    if (!photostripUrl) return;
    if (isPaidHd) {
      trackEvent('download_hd', {
        sessionId: sessionId || undefined,
        properties: { format: selectedFormat },
      });
    } else {
      trackEvent('download_free', {
        sessionId: sessionId || undefined,
        properties: { format: selectedFormat },
      });
    }
    const a = document.createElement('a');
    a.href = photostripUrl;
    a.download = `satu_frame_${selectedFormat}_${isPaidHd ? 'HD' : 'preview'}.jpg`;
    a.click();
  };

  // Permanent deletion for privacy compliance
  const handleDeleteSession = async () => {
    if (!sessionId) return;
    const confirmed = window.confirm(
      'Hapus semua data sesi ini secara permanen? Foto yang tersimpan di server akan langsung dihapus dan link ini tidak dapat dibuka lagi.'
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Data sesi Anda telah berhasil dihapus secara permanen.');
        router.push('/');
      }
    } catch {
      alert('Gagal menghapus data sesi.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <RefreshCw className="h-6 w-6 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 p-1 hover:border-teal-500/60 transition overflow-hidden"
            >
              <Image
                src="/logo-icon.png"
                alt="Satu Frame Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white sm:text-lg">Hasil Photostrip</h1>
              <p className="text-xs text-zinc-400">
                {isPaidHd ? 'Kualitas HD Tanpa Watermark' : 'Pratinjau Gratis (Resolusi Rendah)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/create"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white min-h-[44px]"
            >
              <span>Foto Lagi</span>
            </Link>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 min-h-[44px]"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? 'Tersalin' : 'Simpan Link'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Grid (2-column on Laptop/Desktop, 1-column on Phone/Tablet) */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10 flex-1">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Photostrip Viewport & Format Selector */}
          <div className="flex flex-col items-center lg:col-span-5 lg:sticky lg:top-24">
            {/* Format Selector: Photostrip (1:3), Story (9:16), Feed (4:5) */}
            <div className="mb-4 flex items-center justify-center gap-2 w-full max-w-sm">
              <button
                onClick={() => handleFormatChange('strip')}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                  selectedFormat === 'strip'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-950/40'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Strip (1:3)
              </button>
              <button
                onClick={() => handleFormatChange('story')}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                  selectedFormat === 'story'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-950/40'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Story (9:16)
              </button>
              <button
                onClick={() => handleFormatChange('feed')}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                  selectedFormat === 'feed'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-950/40'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Feed (4:5)
              </button>
            </div>

            {/* Virtual Printer Slot Dispenser */}
            <div className="mx-auto mb-2 h-1.5 w-28 rounded-full bg-zinc-950 border border-zinc-800 shadow-inner" />

            {/* Physical Photostrip Paper Viewport */}
            <div className="relative max-h-[68vh] w-auto overflow-hidden rounded-2xl border-2 border-zinc-700/80 bg-zinc-950 shadow-photostrip-warm p-2 transition-transform duration-300">
              {/* Decorative Washi Tape */}
              <div className="washi-tape absolute -top-3 left-1/2 -translate-x-1/2 z-20" />
              {/* Glossy Paper Glare Overlay */}
              <div className="photo-glossy-glare pointer-events-none rounded-xl" />

              {isFormatSwitching ? (
                <div className="flex h-96 w-56 flex-col items-center justify-center text-center p-4 text-xs text-zinc-400">
                  <RefreshCw className="h-6 w-6 animate-spin text-teal-400 mb-2" />
                  <span>Merender format baru...</span>
                </div>
              ) : photostripUrl ? (
                <img
                  src={photostripUrl}
                  alt="Photostrip Hasil"
                  className="max-h-[64vh] w-auto rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-96 w-56 items-center justify-center text-center p-4 text-xs text-zinc-400">
                  Menyiapkan photostrip...
                </div>
              )}
            </div>

            {/* Paper Authenticity Tag */}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              <span>{isPaidHd ? 'MASTER CETAK HD • 300 DPI' : 'PRATINJAU DENGAN WATERMARK'}</span>
            </div>
          </div>

          {/* Right Column: Actions, Paywall, Couple Timeline, PDP Erasure */}
          <div className="space-y-6 lg:col-span-7">
            {/* Action Buttons & Paywall Offer */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 backdrop-blur-md shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-bold text-white tracking-wide">
                  Unduh & Bagikan Hasil
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                  isPaidHd
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}>
                  {isPaidHd ? 'KUALITAS HD' : 'PRATINJAU GRATIS'}
                </span>
              </div>

              {/* Quality Comparison Card */}
              {!isPaidHd && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Check className="h-4 w-4" />
                    <span>Perbandingan Kualitas Cetak:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 pt-1">
                    <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                      <span className="block font-bold text-zinc-400">Pratinjau Gratis</span>
                      <span className="text-[10px] text-zinc-500">Resolusi web standar + watermark Satu Frame</span>
                    </div>
                    <div className="rounded-lg bg-teal-950/60 p-2 border border-teal-500/30">
                      <span className="block font-bold text-teal-300">Cetak HD Studio</span>
                      <span className="text-[10px] text-teal-200">1080x3240px jernih tanpa watermark, siap cetak fisik</span>
                    </div>
                  </div>
                </div>
              )}

              {isPaidHd ? (
                <button
                  onClick={handleDownload}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-xl hover:bg-emerald-500 active:scale-[0.98] min-h-[50px] transition"
                >
                  <Download className="h-5 w-5" />
                  <span>Unduh Photostrip HD ({selectedFormat.toUpperCase()})</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowPayModal(true);
                      trackEvent('paywall_view', { sessionId: sessionId || undefined });
                    }}
                    className="btn-shutter flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600 py-4 text-base font-extrabold text-white shadow-xl shadow-teal-950/60 hover:brightness-110 active:scale-[0.98] min-h-[52px]"
                  >
                    <Download className="h-4 w-4 text-teal-200" />
                    <span>Buka Kualitas HD Tanpa Watermark (Rp15.000)</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white min-h-[44px] transition"
                  >
                    <Download className="h-4 w-4 text-zinc-400" />
                    <span>Unduh Pratinjau Gratis (Dengan Watermark)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Couple Memory Timeline & Calendar Feature (PRD §4 Pillar C & E, §5.1, §6.2) */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-950/60 border border-teal-900/60 text-amber-400">
                    <Heart className="h-4 w-4 fill-amber-500/20" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">Kalender Momen Pasangan</span>
                    <span className="text-[11px] text-zinc-400">Abadikan ke linimasa kenangan bersama</span>
                  </div>
                </div>
                {!timelineSuccessUrl && (
                  <button
                    type="button"
                    onClick={() => setShowTimelineForm(!showTimelineForm)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 min-h-[44px] flex items-center"
                  >
                    {showTimelineForm ? 'Tutup Formulir' : 'Simpan ke Linimasa'}
                  </button>
                )}
              </div>

              {timelineSuccessUrl ? (
                <div className="space-y-3 pt-2">
                  <div className="rounded-xl bg-emerald-950/30 border border-emerald-900/60 p-3 text-xs text-emerald-300">
                    Photostrip ini telah berhasil disimpan ke linimasa memori Anda.
                  </div>
                  <Link
                    href={timelineSuccessUrl}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-xs font-semibold text-white hover:bg-zinc-700 min-h-[44px]"
                  >
                    <span>Buka Linimasa Memori & Kalender Momen</span>
                    <Heart className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  </Link>
                </div>
              ) : showTimelineForm ? (
                <form onSubmit={handleClaimTimeline} className="space-y-3 pt-2 text-xs">
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    Kaitkan dengan email Anda agar photostrip tersimpan permanen dan kuota paket Anda dapat diakses dari perangkat mana pun selama 90 hari.
                  </p>
                  <div className="space-y-2.5">
                    <input
                      type="email"
                      placeholder="Alamat email Anda"
                      value={timelineEmail}
                      onChange={(e) => setTimelineEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none min-h-[44px]"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Nama Anda (mis. Rara)"
                        value={partnerName1}
                        onChange={(e) => setPartnerName1(e.target.value)}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none min-h-[44px]"
                      />
                      <input
                        type="text"
                        placeholder="Nama Pasangan (mis. Dimas)"
                        value={partnerName2}
                        onChange={(e) => setPartnerName2(e.target.value)}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">Tanggal Jadian / Anniversary:</label>
                      <input
                        type="date"
                        value={annivDate}
                        onChange={(e) => setAnnivDate(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-white focus:border-teal-500 focus:outline-none min-h-[44px]"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Catatan momen ini (mis. Kencan virtual LDR)"
                      value={momentNote}
                      onChange={(e) => setMomentNote(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none min-h-[44px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isClaimingTimeline}
                    className="w-full rounded-xl bg-teal-600 py-3.5 text-xs font-bold text-white hover:bg-teal-500 active:scale-[0.98] disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-1.5 shadow-md shadow-teal-950/40"
                  >
                    {isClaimingTimeline ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5" />}
                    <span>Simpan ke Linimasa Memori</span>
                  </button>
                </form>
              ) : (
                <p className="text-[11px] text-zinc-400">
                  Simpan photostrip ini ke linimasa cinta dan aktifkan hitung mundur hari jadian bersama pasangan.
                </p>
              )}
            </div>

            {/* PDP Data Erasure Button (PRD §14.4) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-3 text-xs">
              <span className="text-[11px] text-zinc-400">Link ini tersimpan aman di browser Anda.</span>
              <button
                onClick={handleDeleteSession}
                disabled={isDeleting}
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-red-400 transition min-h-[44px]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus data sesi secara permanen</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Pilih Paket HD</h3>
              <button
                onClick={() => setShowPayModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {!activeOrder ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setSelectedPackage('1_session')}
                    className={`flex flex-col p-3 rounded-xl border text-left transition ${
                      selectedPackage === '1_session'
                        ? 'border-teal-500 bg-teal-950/25 ring-1 ring-teal-500/50'
                        : 'border-zinc-800 bg-zinc-950/50'
                    }`}
                  >
                    <span className="text-xs font-bold text-white">1 Sesi</span>
                    <span className="text-sm font-extrabold text-amber-400 mt-1">Rp15.000</span>
                    <span className="text-[10px] text-zinc-400 mt-1">HD tanpa watermark</span>
                  </button>

                  <button
                    onClick={() => setSelectedPackage('3_sessions')}
                    className={`flex flex-col p-3 rounded-xl border text-left transition ${
                      selectedPackage === '3_sessions'
                        ? 'border-teal-500 bg-teal-950/25 ring-1 ring-teal-500/50'
                        : 'border-zinc-800 bg-zinc-950/50'
                    }`}
                  >
                    <span className="text-xs font-bold text-white">3 Sesi</span>
                    <span className="text-sm font-extrabold text-amber-400 mt-1">Rp35.000</span>
                    <span className="text-[10px] text-zinc-400 mt-1">Hemat Rp10.000</span>
                  </button>
                </div>

                <button
                  onClick={handleInitiatePayment}
                  disabled={isCreatingOrder}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 font-bold text-white hover:bg-teal-500 active:scale-95 disabled:opacity-50 min-h-[44px] shadow-lg shadow-teal-950/50"
                >
                  {isCreatingOrder ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Lanjut ke Pembayaran</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                {activeOrder.qrCodeUrl && (
                  <div className="flex flex-col items-center">
                    <img
                      src={activeOrder.qrCodeUrl}
                      alt="QRIS Dinamis"
                      className="h-48 w-48 rounded-xl bg-white p-2 border border-zinc-700"
                    />
                    <p className="mt-2 text-xs text-zinc-300">
                      Scan QRIS ini dengan GoPay, OVO, ShopeePay, BCA, atau Mobile Banking
                    </p>
                    <button
                      type="button"
                      onClick={() => handleShareOrSaveQr(activeOrder.qrCodeUrl!)}
                      className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs text-zinc-200 hover:text-white min-h-[44px] w-full"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Simpan atau Bagikan Gambar QRIS</span>
                    </button>
                  </div>
                )}

                {activeOrder.deeplinkUrl && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDeepLink(activeOrder.deeplinkUrl!)}
                      disabled={deepLinkWaiting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3.5 text-xs font-bold text-white hover:bg-sky-500 min-h-[44px] transition active:scale-95 disabled:opacity-60"
                    >
                      {deepLinkWaiting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      <span>{deepLinkWaiting ? 'Membuka GoPay...' : 'Buka Aplikasi GoPay'}</span>
                    </button>

                    {deepLinkFailed && (
                      <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 p-2.5 text-left text-[11px] text-amber-200">
                        Aplikasi GoPay tidak merespons otomatis. Silakan gunakan pemindaian gambar QRIS di atas untuk menyelesaikan pembayaran.
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCancelAndChangeMethod}
                    className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200 py-2 min-h-[44px]"
                  >
                    Batal dan Ganti Paket / Metode
                  </button>
                </div>

                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-[11px] text-zinc-400 mb-2">Simulasi Pengujian Lokal:</p>
                  <button
                    onClick={handleSimulateSuccess}
                    className="w-full rounded-xl border border-emerald-700 bg-emerald-950/40 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 min-h-[44px]"
                  >
                    Simulasikan Pembayaran Sukses
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
