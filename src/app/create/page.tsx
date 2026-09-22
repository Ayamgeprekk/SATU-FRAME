'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Camera,
  ArrowRight,
  ShieldCheck,
  Heart,
  ArrowLeft,
  Check,
  KeyRound,
  Search,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PHOTO_TEMPLATES, getStyleTheme } from '@/lib/render/templates';
import { FrameTemplate } from '@/types/session';
import { trackEvent } from '@/lib/analytics';

const MOMENTS = [
  { id: 'anniversary', title: 'Anniversary', subtitle: 'Perayaan tanggal jadian atau pernikahan' },
  { id: 'date_night', title: 'Kencan Virtual', subtitle: 'Waktu ngobrol santai akhir pekan' },
  { id: 'birthday', title: 'Ulang Tahun', subtitle: 'Kado foto untuk sahabat yang jauh' },
  { id: 'graduation', title: 'Wisuda & Kelulusan', subtitle: 'Kenang momen kelulusan bersama' },
  { id: 'casual', title: 'Momen Bebas', subtitle: 'Foto santai saat rindu bercanda' },
];

const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'Semua Momen' },
  { id: 'newspaper', label: 'Koran & Warta' },
  { id: 'magazine', label: 'Majalah & Zine' },
  { id: 'romantic', label: 'Pasangan & LDR' },
  { id: 'wedding', label: 'Pernikahan' },
  { id: 'graduation', label: 'Wisuda' },
  { id: 'reunion', label: 'Reuni & Sahabat' },
  { id: 'birthday', label: 'Ulang Tahun' },
  { id: 'travel', label: 'Wisata & Liburan' },
  { id: 'concert', label: 'Konser & Musik' },
  { id: 'comic', label: 'Komik & Pop Art' },
  { id: 'fandom', label: 'K-Pop & Idol' },
  { id: 'vintage', label: 'Vintage Film' },
  { id: 'classic', label: 'Klasik' },
  { id: 'minimal', label: 'Minimalis' },
];

const TEMPLATE_TIERS = [
  { id: 'all', label: 'Semua Desain' },
  { id: 'exclusive', label: 'Eksklusif' },
  { id: 'standard', label: 'Standar' },
];

function TemplateVisualPreview({
  template,
  isMini = false,
}: {
  template: FrameTemplate;
  isMini?: boolean;
}) {
  const theme = getStyleTheme(template);
  const textColor = template.textColor || (template.category === 'classic' ? '#f4f4f5' : '#1c1917');
  const subtextColor = template.subtextColor || (template.category === 'classic' ? '#a1a1aa' : '#57534e');

  return (
    <div
      className={`relative w-full overflow-hidden transition ${
        isMini
          ? 'h-24 rounded-lg p-2'
          : 'rounded-xl p-3 sm:p-4 shadow-photostrip-warm border min-h-[440px] flex flex-col justify-between'
      }`}
      style={{
        backgroundColor: template.backgroundColor,
        borderColor: template.borderColor || (template.category === 'classic' ? '#3f3f46' : '#d4d4d8'),
      }}
    >
      {!isMini && <div className="photo-glossy-glare pointer-events-none rounded-xl" />}
      {!isMini && <div className="washi-tape absolute -top-2.5 left-1/2 -translate-x-1/2 z-20" />}

      {theme === 'newspaper' && (
        <div className="flex flex-col h-full justify-between select-none">
          <div className="border-b-2 pb-1 border-current" style={{ color: textColor }}>
            <div className="flex justify-between items-center text-[7px] font-serif uppercase tracking-wider mb-0.5" style={{ color: subtextColor }}>
              <span>NO. 1926</span>
              <span>EDISI KHUSUS</span>
              <span>RP 15.000</span>
            </div>
            <div className="text-center font-serif font-black tracking-widest uppercase truncate text-[11px]" style={{ color: textColor }}>
              {template.headerText || 'THE DAILY CHRONICLE'}
            </div>
          </div>

          {isMini ? (
            <div className="relative my-1.5 grid grid-cols-2 gap-1 flex-1">
              <div className="absolute inset-y-0 left-1/2 w-px border-r border-dashed opacity-40" style={{ borderColor: textColor }} />
              <div className="bg-black/15 rounded flex items-center justify-center text-[8px]" style={{ color: textColor }}>Kamu</div>
              <div className="bg-black/15 rounded flex items-center justify-center text-[8px]" style={{ color: textColor }}>Partner</div>
            </div>
          ) : (
            <div className="relative my-2 flex-1 flex flex-col gap-2">
              {[1, 2, 3].map((slotIdx) => (
                <div key={slotIdx} className="grid grid-cols-2 gap-1.5 p-1 bg-black/5 rounded border border-current/20" style={{ borderColor: subtextColor }}>
                  <div className="aspect-[4/3] bg-black/10 rounded flex items-center justify-center text-[9px] font-sans font-medium" style={{ color: textColor }}>
                    Kamu #{slotIdx}
                  </div>
                  <div className="aspect-[4/3] bg-black/10 rounded flex items-center justify-center text-[9px] font-sans font-medium" style={{ color: textColor }}>
                    Partner #{slotIdx}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-1 flex justify-between items-center border-current" style={{ color: textColor }}>
            <span className="text-[7px] font-serif truncate" style={{ color: subtextColor }}>
              BERITA UTAMA • DUA TEMPAT SATU MOMEN
            </span>
            <div className="rounded-full border border-current px-1 text-[6px] font-serif font-bold" style={{ color: textColor }}>
              VERIFIED
            </div>
          </div>
        </div>
      )}

      {theme === 'magazine' && (
        <div className="flex flex-col h-full justify-between select-none">
          <div className="text-center border-b pb-1" style={{ borderColor: subtextColor }}>
            <div className="text-[11px] font-black tracking-widest uppercase truncate" style={{ color: textColor }}>
              {template.headerText || 'THE EDITORIAL'}
            </div>
            <div className="text-[6px] tracking-widest uppercase font-semibold" style={{ color: subtextColor }}>
              HAUTE COLLECTION • ISSUE #08
            </div>
          </div>

          {isMini ? (
            <div className="relative my-1.5 grid grid-cols-2 gap-1 flex-1 p-0.5 border border-current/20 rounded" style={{ borderColor: textColor }}>
              <div className="bg-black/15 rounded flex items-center justify-center text-[8px]" style={{ color: textColor }}>Kamu</div>
              <div className="bg-black/15 rounded flex items-center justify-center text-[8px]" style={{ color: textColor }}>Partner</div>
            </div>
          ) : (
            <div className="relative my-2 flex-1 flex flex-col gap-2">
              {[1, 2, 3].map((slotIdx) => (
                <div key={slotIdx} className="grid grid-cols-2 gap-1.5 p-1 bg-black/10 rounded border border-current/25" style={{ borderColor: textColor }}>
                  <div className="aspect-[4/3] bg-black/20 rounded flex items-center justify-center text-[9px] font-sans font-medium" style={{ color: textColor }}>
                    Kamu #{slotIdx}
                  </div>
                  <div className="aspect-[4/3] bg-black/20 rounded flex items-center justify-center text-[9px] font-sans font-medium" style={{ color: textColor }}>
                    Partner #{slotIdx}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-end pt-1">
            <div className="text-[7px] font-mono leading-tight" style={{ color: subtextColor }}>
              <span>ISSN 2026</span>
              <span className="block text-[6px]">LIMITED</span>
            </div>
            <div className="flex items-center gap-0.5 bg-white/10 px-1 py-0.5 rounded">
              <div className="h-3 w-0.5 bg-current" style={{ color: textColor }} />
              <div className="h-3 w-1 bg-current" style={{ color: textColor }} />
              <div className="h-3 w-0.5 bg-current" style={{ color: textColor }} />
              <div className="h-3 w-1.5 bg-current" style={{ color: textColor }} />
              <div className="h-3 w-0.5 bg-current" style={{ color: textColor }} />
              <span className="text-[6px] font-mono ml-0.5" style={{ color: textColor }}>977123</span>
            </div>
          </div>
        </div>
      )}

      {theme === 'film_35mm' && (
        <div className="relative flex h-full flex-col justify-between select-none px-3">
          <div className="absolute left-1 inset-y-1 flex flex-col justify-between py-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="w-1.5 h-2.5 rounded-sm bg-black/40 border border-white/20" />
            ))}
          </div>
          <div className="absolute right-1 inset-y-1 flex flex-col justify-between py-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="w-1.5 h-2.5 rounded-sm bg-black/40 border border-white/20" />
            ))}
          </div>

          <div className="text-center">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase truncate block" style={{ color: textColor }}>
              {template.headerText || '35MM FILM NEGATIVE'}
            </span>
          </div>

          {isMini ? (
            <div className="grid grid-cols-2 gap-1 my-1 flex-1">
              <div className="bg-black/30 rounded border border-white/10 flex items-center justify-center text-[8px]" style={{ color: textColor }}>
                Kamu
              </div>
              <div className="bg-black/30 rounded border border-white/10 flex items-center justify-center text-[8px]" style={{ color: textColor }}>
                Partner
              </div>
            </div>
          ) : (
            <div className="relative my-2 flex-1 flex flex-col gap-2">
              {[1, 2, 3].map((slotIdx) => (
                <div key={slotIdx} className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded border border-white/10">
                  <div className="aspect-[4/3] bg-black/50 rounded flex items-center justify-center text-[9px] font-sans font-medium" style={{ color: textColor }}>
                    Kamu #{slotIdx}
                  </div>
                  <div className="aspect-[4/3] bg-black/50 rounded flex items-center justify-center text-[9px] font-sans font-medium" style={{ color: textColor }}>
                    Partner #{slotIdx}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between text-[7px] font-mono" style={{ color: subtextColor }}>
            <span>▲ 01A</span>
            <span>KODAK 400 FILM</span>
            <span>▲ 02A</span>
          </div>
        </div>
      )}

      {theme === 'wedding_botanical' && (
        <div className="flex flex-col h-full justify-between select-none border border-current/30 p-2 rounded" style={{ color: subtextColor }}>
          <div className="text-center">
            <span className="text-[7px] uppercase tracking-widest block font-serif" style={{ color: subtextColor }}>
              ❧ THE VOWS ☙
            </span>
            <span className="text-[10px] font-serif font-bold tracking-wider uppercase truncate block" style={{ color: textColor }}>
              {template.headerText || 'ETERNAL LOVE'}
            </span>
          </div>

          {isMini ? (
            <div className="grid grid-cols-2 gap-1 my-1 flex-1">
              <div className="bg-black/10 rounded flex items-center justify-center text-[8px] font-serif" style={{ color: textColor }}>
                Kamu
              </div>
              <div className="bg-black/10 rounded flex items-center justify-center text-[8px] font-serif" style={{ color: textColor }}>
                Partner
              </div>
            </div>
          ) : (
            <div className="relative my-2 flex-1 flex flex-col gap-2">
              {[1, 2, 3].map((slotIdx) => (
                <div key={slotIdx} className="grid grid-cols-2 gap-1.5 p-1 bg-black/5 rounded border border-current/20" style={{ borderColor: subtextColor }}>
                  <div className="aspect-[4/3] bg-black/10 rounded flex items-center justify-center text-[9px] font-serif" style={{ color: textColor }}>
                    Kamu #{slotIdx}
                  </div>
                  <div className="aspect-[4/3] bg-black/10 rounded flex items-center justify-center text-[9px] font-serif" style={{ color: textColor }}>
                    Partner #{slotIdx}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center text-[8px] font-serif" style={{ color: subtextColor }}>
            <span>Forever & Always • 2026</span>
          </div>
        </div>
      )}

      {theme === 'postcard_airmail' && (
        <div className="flex flex-col h-full justify-between select-none relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-blue-600 to-red-600 mb-1 rounded-t" />

          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: textColor }}>
              PAR AVION
            </span>
            <div className="border border-red-600 text-red-600 px-1 text-[7px] font-bold rounded">
              AIR MAIL
            </div>
          </div>

          {isMini ? (
            <div className="grid grid-cols-2 gap-1 my-1 flex-1">
              <div className="bg-black/15 rounded flex items-center justify-center text-[8px]" style={{ color: textColor }}>
                Kamu
              </div>
              <div className="bg-black/15 rounded flex items-center justify-center text-[8px]" style={{ color: textColor }}>
                Partner
              </div>
            </div>
          ) : (
            <div className="relative my-2 flex-1 flex flex-col gap-2">
              {[1, 2, 3].map((slotIdx) => (
                <div key={slotIdx} className="grid grid-cols-2 gap-1.5 p-1 bg-black/10 rounded border border-dashed border-zinc-400/40">
                  <div className="aspect-[4/3] bg-black/15 rounded flex items-center justify-center text-[9px] font-sans font-medium" style={{ color: textColor }}>
                    Kamu #{slotIdx}
                  </div>
                  <div className="aspect-[4/3] bg-black/15 rounded flex items-center justify-center text-[9px] font-sans font-medium" style={{ color: textColor }}>
                    Partner #{slotIdx}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 mt-1 rounded-b" />
        </div>
      )}

      {theme === 'comic_screentone' && (
        <div className="flex flex-col h-full justify-between select-none">
          <div className="bg-yellow-300 text-black border-2 border-black px-1 text-center font-black text-[9px] tracking-wide rounded">
            {template.headerText || 'POW! CHAPTER 01'}
          </div>

          {isMini ? (
            <div className="grid grid-cols-2 gap-1 my-1 flex-1">
              <div className="bg-white/40 border border-black rounded flex items-center justify-center text-[8px] font-bold text-black">
                Kamu
              </div>
              <div className="bg-white/40 border border-black rounded flex items-center justify-center text-[8px] font-bold text-black">
                Partner
              </div>
            </div>
          ) : (
            <div className="relative my-2 flex-1 flex flex-col gap-2">
              {[1, 2, 3].map((slotIdx) => (
                <div key={slotIdx} className="grid grid-cols-2 gap-1.5 p-1 bg-white/30 rounded border-2 border-black">
                  <div className="aspect-[4/3] bg-white/60 rounded flex items-center justify-center text-[9px] font-bold text-black">
                    Kamu #{slotIdx}
                  </div>
                  <div className="aspect-[4/3] bg-white/60 rounded flex items-center justify-center text-[9px] font-bold text-black">
                    Partner #{slotIdx}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white text-black border-2 border-black px-1 text-[7px] font-black text-center rounded">
            TO BE CONTINUED...
          </div>
        </div>
      )}

      {theme !== 'newspaper' &&
        theme !== 'magazine' &&
        theme !== 'film_35mm' &&
        theme !== 'wedding_botanical' &&
        theme !== 'postcard_airmail' &&
        theme !== 'comic_screentone' && (
          <div className="flex flex-col h-full justify-between select-none">
            <div className="text-center">
              <span className="text-[10px] font-bold tracking-widest uppercase truncate block" style={{ color: textColor }}>
                {template.headerText || template.name}
              </span>
            </div>

            {isMini ? (
              <div className="grid grid-cols-2 gap-1 my-1 flex-1">
                <div className="bg-black/20 rounded flex items-center justify-center text-[8px]" style={{ color: textColor }}>
                  Kamu
                </div>
                <div className="bg-black/20 rounded flex items-center justify-center text-[8px]" style={{ color: textColor }}>
                  Partner
                </div>
              </div>
            ) : (
              <div className="relative my-2 flex-1 flex flex-col gap-2">
                {[1, 2, 3].map((slotIdx) => (
                  <div key={slotIdx} className="grid grid-cols-2 gap-1.5 p-1 bg-black/15 rounded border border-current/20" style={{ borderColor: subtextColor }}>
                    <div className="aspect-[4/3] bg-black/20 rounded flex items-center justify-center text-[9px] font-sans font-medium" style={{ color: textColor }}>
                      Kamu #{slotIdx}
                    </div>
                    <div className="aspect-[4/3] bg-black/20 rounded flex items-center justify-center text-[9px] font-sans font-medium" style={{ color: textColor }}>
                      Partner #{slotIdx}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center">
              <span className="text-[8px] font-medium block truncate" style={{ color: subtextColor }}>
                {template.footerText || 'SATU FRAME'}
              </span>
            </div>
          </div>
        )}
    </div>
  );
}

function CreateStudioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplate = searchParams.get('template');

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [selectedMoment, setSelectedMoment] = useState(MOMENTS[0].id);
  const [selectedTemplate, setSelectedTemplate] = useState(
    preselectedTemplate && PHOTO_TEMPLATES.some((t) => t.id === preselectedTemplate)
      ? preselectedTemplate
      : PHOTO_TEMPLATES[0].id
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<'all' | 'exclusive' | 'standard'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    trackEvent('landing_view');
  }, []);

  useEffect(() => {
    const tId = searchParams.get('template');
    if (tId) {
      const found = PHOTO_TEMPLATES.find((item) => item.id === tId);
      if (found) {
        setSelectedTemplate(found.id);
        setSelectedCategory(found.category);
      }
    }
  }, [searchParams]);

  const filteredTemplates = useMemo(() => {
    return PHOTO_TEMPLATES.filter((tmpl) => {
      const matchCategory = selectedCategory === 'all' || tmpl.category === selectedCategory;
      const matchTier =
        selectedTier === 'all' ||
        (selectedTier === 'exclusive' && tmpl.isPremium) ||
        (selectedTier === 'standard' && !tmpl.isPremium);
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        tmpl.name.toLowerCase().includes(q) ||
        (tmpl.eventTag && tmpl.eventTag.toLowerCase().includes(q)) ||
        (tmpl.headerText && tmpl.headerText.toLowerCase().includes(q)) ||
        (tmpl.footerText && tmpl.footerText.toLowerCase().includes(q));

      return matchCategory && matchTier && matchQuery;
    });
  }, [selectedCategory, selectedTier, searchQuery]);

  const activeTemplateObj =
    PHOTO_TEMPLATES.find((t) => t.id === selectedTemplate) || PHOTO_TEMPLATES[0];

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          momentId: selectedMoment,
        }),
      });

      const data = await res.json();
      if (res.ok && data.roomCode) {
        trackEvent('create_room', {
          sessionId: data.session.id,
          properties: { templateId: selectedTemplate, momentId: selectedMoment },
        });
        localStorage.setItem(`sf_token_${data.session.id}`, data.creatorToken);
        localStorage.setItem(`sf_role_${data.session.id}`, 'creator');
        if (displayName.trim()) {
          localStorage.setItem(`sf_name_${data.session.id}`, displayName.trim());
        }
        router.push(`/room/${data.roomCode}`);
      } else {
        setErrorMsg(data.error || 'Gagal menyiapkan room. Silakan coba lagi.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) return;
    router.push(`/room/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-30 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 transition hover:text-white min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 overflow-hidden">
              <Image
                src="/logo-icon.png"
                alt="Satu Frame Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">SATU FRAME STUDIO</span>
          </div>

          <Link
            href="/timeline"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-zinc-700 hover:text-white min-h-[44px]"
          >
            <Heart className="h-3.5 w-3.5 text-amber-400 fill-amber-500/30" />
            <span className="hidden sm:inline">Linimasa Memori</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-28 sm:px-6 lg:py-12 lg:pb-12">
        {/* Tab Switcher: Buat Room vs Gabung Kode */}
        <div className="mx-auto mb-8 flex max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition min-h-[44px] ${
              activeTab === 'create'
                ? 'bg-teal-600 text-white shadow-sm shadow-teal-950/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Mulai Sesi Baru
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition min-h-[44px] ${
              activeTab === 'join'
                ? 'bg-teal-600 text-white shadow-sm shadow-teal-950/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Masuk dengan Kode
          </button>
        </div>

        {activeTab === 'join' ? (
          /* Join Room View */
          <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 text-center backdrop-blur-sm shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 text-teal-400">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Masukkan Kode Room</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Menerima tautan atau kode 8 karakter dari pasangan atau sahabatmu?
            </p>

            <form onSubmit={handleJoinByCode} className="mt-6 space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Contoh: 7KPRHP7S"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  maxLength={8}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-center font-mono text-base font-bold uppercase tracking-widest text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none min-h-[48px]"
                />
              </div>
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-950/40 transition hover:bg-teal-500 active:scale-[0.98] disabled:opacity-40 min-h-[48px]"
              >
                <span>Masuk ke Studio</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          /* Create Studio Flow */
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Configuration Forms */}
            <div className="space-y-8 lg:col-span-7">
              {/* Mood and moment selection */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-[11px]">
                    1
                  </span>
                  <span>PILIH SUASANA MOMEN</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {MOMENTS.map((moment) => {
                    const isSelected = selectedMoment === moment.id;
                    return (
                      <button
                        key={moment.id}
                        type="button"
                        onClick={() => setSelectedMoment(moment.id)}
                        className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition min-h-[64px] ${
                          isSelected
                            ? 'border-teal-500 bg-teal-950/30 ring-1 ring-teal-500/60 text-white shadow-md'
                            : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/80'
                        }`}
                      >
                        <span className="text-sm font-semibold">{moment.title}</span>
                        <span className="text-[11px] text-zinc-400 mt-0.5">{moment.subtitle}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Frame selection */}
              <section className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-teal-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-[11px]">
                      2
                    </span>
                    <span>PILIH DESAIN FRAME ({filteredTemplates.length} DARI {PHOTO_TEMPLATES.length} TERSEDIA)</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">40 template tematik (Koran, Majalah, Wedding, dll)</span>
                </div>

                {/* Filter & Search Toolbar */}
                <div className="space-y-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3.5">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Cari tema (contoh: koran, majalah, wisuda, wedding, zine, kpop)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none min-h-[44px]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Bersihkan pencarian"
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 mb-2">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-teal-400" />
                      <span>Kategori Momen</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_CATEGORIES.map((cat) => {
                        const isCatSelected = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition min-h-[44px] flex items-center ${
                              isCatSelected
                                ? 'bg-teal-600 text-white shadow-sm shadow-teal-950/40'
                                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800/60'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tier / Status Filter & Reset */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60">
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_TIERS.map((tier) => {
                        const isTierSelected = selectedTier === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setSelectedTier(tier.id as 'all' | 'exclusive' | 'standard')}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition min-h-[44px] flex items-center gap-1 ${
                              isTierSelected
                                ? 'bg-zinc-200 text-zinc-950 shadow-sm'
                                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800/60'
                            }`}
                          >
                            <span>{tier.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {(selectedCategory !== 'all' || selectedTier !== 'all' || searchQuery.trim() !== '') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('all');
                          setSelectedTier('all');
                          setSearchQuery('');
                        }}
                        className="flex items-center gap-1 text-[11px] font-medium text-teal-400 hover:text-teal-300 min-h-[44px] px-2"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Reset Filter</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Templates Grid or Empty State */}
                {filteredTemplates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center">
                    <p className="text-xs text-zinc-400">
                      Tidak ada desain frame yang sesuai dengan kriteria filter saat ini.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedTier('all');
                        setSearchQuery('');
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 min-h-[44px]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Kembalikan Semua Template</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-h-[460px] overflow-y-auto pr-1">
                    {filteredTemplates.map((tmpl) => {
                      const isSelected = selectedTemplate === tmpl.id;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => setSelectedTemplate(tmpl.id)}
                          className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 text-left transition min-h-[110px] ${
                            isSelected
                              ? 'border-teal-500 bg-teal-950/25 ring-2 ring-teal-500/50 shadow-md'
                              : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/80'
                          }`}
                        >
                          <div>
                            {/* Thematic Visual Preview Card */}
                            <div className="relative w-full transition group-hover:scale-[1.02]">
                              <TemplateVisualPreview template={tmpl} isMini={true} />
                              {isSelected && (
                                <div className="absolute right-2 top-2 h-5 w-5 rounded-full bg-teal-600 flex items-center justify-center text-white shadow-md z-10">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                            </div>

                            <div className="mt-2.5 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-bold text-white line-clamp-1">{tmpl.name}</h4>
                              </div>
                              <span className="inline-block rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-medium text-teal-300 border border-zinc-700/50">
                                {tmpl.eventTag || tmpl.category}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            {tmpl.isPremium ? (
                              <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 border border-amber-500/30">
                                <span>{tmpl.badge || 'Eksklusif'}</span>
                              </span>
                            ) : (
                              <span className="text-[9px] text-zinc-400">Standar</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Display name input */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-[11px]">
                    3
                  </span>
                  <span>NAMA PANGGILANMU DI STUDIO (OPSIONAL)</span>
                </div>
                <input
                  type="text"
                  placeholder="Misal: Zidane, Rara, Dika"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={24}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none min-h-[48px]"
                />
              </section>

              {/* Error notification if any */}
              {errorMsg && (
                <div className="rounded-xl border border-red-900 bg-red-950/50 p-3.5 text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  onClick={handleCreateRoom}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-4 text-base font-semibold text-white shadow-xl shadow-teal-950/50 transition hover:bg-teal-500 active:scale-[0.98] disabled:opacity-50 min-h-[52px]"
                >
                  {isLoading ? (
                    <span>Menyiapkan Studio Photobooth...</span>
                  ) : (
                    <>
                      <span>Mulai Sesi Foto Sekarang</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="mt-2.5 text-center text-[11px] text-zinc-400">
                  Link room otomatis dibuat dan dapat langsung Anda bagikan ke pasangan atau sahabat.
                </p>
              </div>
            </div>

            {/* Right Column: Live Frame Preview & Highlights */}
            <div className="hidden lg:col-span-5 lg:block">
              <div className="sticky top-24 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md shadow-2xl">
                {/* Virtual Photobooth Slot */}
                <div className="mx-auto mb-3 h-1.5 w-24 rounded-full bg-zinc-950 border border-zinc-800 shadow-inner" />
                <div className="text-center mb-4">
                  <h3 className="font-serif text-sm font-bold text-zinc-200 tracking-wide">
                    Pratinjau Kertas Foto Fisik
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Hasil cetak 3-shot dengan tema terpilih
                  </p>
                </div>

                {/* Simulated Photostrip Card with Full Thematic Ornaments */}
                <div className="mx-auto w-64 max-w-full transform hover:rotate-0 transition-transform duration-300">
                  <TemplateVisualPreview template={activeTemplateObj} isMini={false} />
                </div>

                {/* Event tag & badge highlight in preview */}
                <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-950/80 px-3 py-2 border border-zinc-800">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400">Tema Momen</span>
                    <span className="text-xs font-bold text-white">{activeTemplateObj.eventTag || activeTemplateObj.name}</span>
                  </div>
                  {activeTemplateObj.isPremium ? (
                    <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                      <span>{activeTemplateObj.badge || 'Eksklusif'}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-medium">Standar</span>
                  )}
                </div>

                {/* Badges Checklist */}
                <div className="mt-6 space-y-2.5 border-t border-zinc-800/80 pt-5 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Resolusi HD Tajam (Capture lokal perangkat)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Shutter Sinkron Audio-Visual 4-Lapis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Privat: File mentah dihapus 24 jam</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Floating Sticky Action Bar (Solves scrolling friction on mobile devices) */}
      {activeTab === 'create' && (
        <div className="fixed bottom-0 inset-x-0 z-30 lg:hidden border-t border-zinc-800 bg-zinc-950/95 p-3.5 backdrop-blur-lg shadow-2xl">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 truncate">
                {activeTemplateObj.isPremium ? 'Eksklusif' : 'Standar'} • {activeTemplateObj.category}
              </span>
              <span className="text-xs font-bold text-white truncate">{activeTemplateObj.name}</span>
            </div>
            <button
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-950/50 hover:bg-teal-500 active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
            >
              {isLoading ? (
                <span>Menyiapkan...</span>
              ) : (
                <>
                  <span>Mulai Sesi</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Footer Minimal */}
      <footer className="border-t border-zinc-900 bg-zinc-950 px-4 py-6 text-center text-xs text-zinc-400">
        <p>Satu Frame v2.1: Dua tempat, satu momen. Browser-only tanpa install.</p>
      </footer>
    </div>
  );
}

export default function CreateStudioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">Memuat studio...</div>}>
      <CreateStudioInner />
    </Suspense>
  );
}

