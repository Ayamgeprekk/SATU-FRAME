'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

function PayReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('t');
  const orderId = searchParams.get('order');

  const [status, setStatus] = useState<'checking' | 'paid' | 'pending'>('checking');

  useEffect(() => {
    if (!token) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        if (orderId) {
          const res = await fetch(`/api/orders/${orderId}/status`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'PAID') {
              setStatus('paid');
              clearInterval(interval);
              setTimeout(() => {
                router.replace(`/r/${token}`);
              }, 1200);
              return;
            }
          }
        }
      } catch {}

      if (attempts >= 10) {
        clearInterval(interval);
        // Redirect back to result page regardless, let result page continue listening
        router.replace(`/r/${token}`);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [token, orderId, router]);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center space-y-4">
      {status === 'paid' ? (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Pembayaran Berhasil!</h2>
          <p className="text-xs text-zinc-300">Menyiapkan photostrip kualitas HD...</p>
        </>
      ) : (
        <>
          <RefreshCw className="mx-auto h-10 w-10 animate-spin text-teal-400" />
          <h2 className="text-lg font-bold text-white">Memverifikasi Pembayaran</h2>
          <p className="text-xs text-zinc-400">
            Mohon tunggu beberapa detik, kami sedang memeriksa konfirmasi dari penyedia pembayaran...
          </p>
        </>
      )}
    </div>
  );
}

export default function PayReturnPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-teal-400" />
            <p className="text-xs text-zinc-400">Memuat status pembayaran...</p>
          </div>
        }
      >
        <PayReturnContent />
      </Suspense>
    </main>
  );
}
