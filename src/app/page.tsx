'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  Camera,
  ArrowRight,
  ShieldCheck,
  Heart,
  Clock,
  Check,
  Users,
  Smartphone,
  ChevronDown,
  KeyRound,
  Download,
  Calendar,
  Zap,
  Play,
  RotateCw,
} from 'lucide-react';
import { PHOTO_TEMPLATES, getStyleTheme } from '@/lib/render/templates';
import { trackEvent } from '@/lib/analytics';

const FAQ_ITEMS = [
  {
    q: 'Apakah saya dan pasangan harus menginstal aplikasi?',
    a: 'Tidak perlu sama sekali. Satu Frame berjalan 100% langsung di peramban web (Safari di iPhone, Chrome di Android, maupun laptop). Anda cukup membagikan link room ke pasangan.',
  },
  {
    q: 'Bagaimana cara kerja sinkronisasi shutter kamera?',
    a: 'Sistem menyinkronkan jam kedua perangkat melalui protokol jaringan presisi tinggi. Saat hitungan mundur 3-2-1 selesai, kamera Anda dan pasangan menjepret secara bersamaan, kemudian memilih frame terbaik yang paling jernih dan fokus.',
  },
  {
    q: 'Apakah foto kami aman dan privat?',
    a: 'Sangat aman. Seluruh foto mentah otomatis dimusnahkan permanen dari server dalam 24 jam sesuai prinsip perlindungan data pribadi (UU PDP No. 27/2022). Video tatap muka langsung terhubung antar-perangkat (P2P) tanpa disimpan di server.',
  },
  {
    q: 'Berapa biaya untuk menggunakan Satu Frame?',
    a: 'Anda dapat berfoto dan melihat pratinjau hasil berwatermark secara gratis. Untuk mengunduh photostrip resolusi tinggi HD tanpa watermark, biayanya Rp15.000 untuk 1 sesi atau Rp35.000 untuk paket 3 sesi dengan masa aktif 90 hari.',
  },
];

function TemplateShowcaseVisual({ template }: { template: (typeof PHOTO_TEMPLATES)[number] }) {
  const theme = getStyleTheme(template);
  const tc = template.textColor || '#1c1917';
  const sc = template.subtextColor || '#57534e';
  const bc = template.borderColor || '#d4d4d8';

  // ── NEWSPAPER ─────────────────────────────────────────────
  if (theme === 'newspaper') {
    const isSepia = template.id === 'vintage_press_sepia';
    const isTabloid = template.id === 'tabloid_pop_press';
    return (
      <div className="h-36 w-full rounded-xl overflow-hidden select-none relative flex flex-col" style={{ backgroundColor: template.backgroundColor, border: `2px solid ${bc}` }}>
        <div className="px-2 pt-1.5 pb-0.5 border-b" style={{ borderColor: tc + '40' }}>
          <div className="flex justify-between items-baseline mb-0.5">
            <span className="text-[5px] font-serif uppercase tracking-widest" style={{ color: sc }}>{isSepia ? 'Est. 1920' : isTabloid ? 'CELEBRITY' : 'Est. 1945'}</span>
            <span className="text-[5px] font-serif" style={{ color: sc }}>{isSepia ? 'No. MCMXXVI' : isTabloid ? 'EXCLUSIVE' : 'Vol. LXXIV'}</span>
          </div>
          <span className={`block font-serif font-black uppercase tracking-widest truncate text-center ${isTabloid ? 'text-[10px]' : 'text-[9px]'}`} style={{ color: tc }}>
            {isTabloid ? 'HOT NEWS' : isSepia ? 'THE VINTAGE PRESS' : 'THE DAILY CHRONICLE'}
          </span>
          <div className="flex items-center mt-0.5">
            <div className="h-[1px] flex-1 mr-1" style={{ backgroundColor: tc + '60' }} />
            <span className="text-[4.5px] font-serif tracking-widest px-0.5 whitespace-nowrap" style={{ color: sc }}>EDISI KHUSUS</span>
            <div className="h-[1px] flex-1 ml-1" style={{ backgroundColor: tc + '60' }} />
          </div>
        </div>
        <div className="px-1.5 py-1 flex gap-1 flex-1 min-h-0">
          <div className="flex-[2] rounded-[2px] overflow-hidden relative" style={{ backgroundColor: tc + '15', border: `1px solid ${tc}30` }}>
            <div className="absolute inset-0 flex items-center justify-center opacity-25">
              <div className="w-2/3 h-3/4 rounded-[1px]" style={{ backgroundColor: tc }} />
            </div>
            <div className="absolute bottom-0.5 left-0.5 right-0.5">
              <div className="text-[4px] font-serif font-bold leading-tight px-0.5" style={{ color: tc }}>HEADLINE UTAMA</div>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-0.5">
            {[0,1].map(i => (
              <div key={i} className="flex-1 rounded-[2px] relative overflow-hidden" style={{ backgroundColor: tc + '10', border: `1px solid ${tc}20` }}>
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <div className="w-3/4 h-1/2 rounded-[1px]" style={{ backgroundColor: tc }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="text-[4.5px] font-serif leading-tight" style={{ color: tc }}>
              <div className="h-0.5 w-4 mb-0.5" style={{ backgroundColor: bc }} />
              Dua insan terdekat terabadikan dalam satu bingkai kenangan.
            </div>
            <div className="flex-1 rounded-[2px] relative overflow-hidden" style={{ backgroundColor: tc + '10', border: `1px solid ${tc}20` }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="w-3/4 h-1/2 rounded-[1px]" style={{ backgroundColor: tc }} />
              </div>
            </div>
          </div>
        </div>
        <div className="px-2 pb-1 flex justify-between items-center">
          <span className="text-[4px] font-serif" style={{ color: sc }}>BERITA UTAMA • SATU FRAME</span>
          <span className="text-[4px] font-serif border px-0.5 rounded-[1px]" style={{ color: tc, borderColor: tc + '60' }}>VERIFIED</span>
        </div>
      </div>
    );
  }

  // ── MAGAZINE ───────────────────────────────────────────────
  if (theme === 'magazine') {
    const isVogue = template.id === 'vogue_minimal_editorial';
    const isZine = template.id === 'indie_zine_riot';
    const isCityPop = template.id === 'japan_citypop_magazine';
    const isKinfolk = template.id === 'kinfolk_slow_living';
    return (
      <div className="h-36 w-full rounded-xl overflow-hidden select-none relative flex flex-col" style={{ backgroundColor: template.backgroundColor, border: `2px solid ${bc}` }}>
        <div className="px-2.5 pt-2 pb-1 border-b" style={{ borderColor: isVogue ? '#27272a' : isZine ? '#52525b' : tc + '30' }}>
          {isVogue && <div className="flex justify-between items-center mb-0.5"><span className="text-[4.5px] font-mono tracking-[0.3em] uppercase" style={{ color: sc }}>SEPT 2026</span><span className="text-[4.5px] font-mono" style={{ color: sc }}>VOL.08</span></div>}
          {isCityPop && <div className="text-[5px] font-bold tracking-[0.4em] uppercase mb-0.5" style={{ color: '#fda4af' }}>♪ CITY POP MAGAZINE ♪</div>}
          <div className={`font-black uppercase truncate ${isVogue ? 'text-[13px] tracking-widest' : isZine ? 'text-[10px] tracking-wide' : isCityPop ? 'text-[9px] tracking-widest' : isKinfolk ? 'text-[9px] tracking-[0.4em] font-light' : 'text-[10px] tracking-widest'}`} style={{ color: tc }}>
            {isVogue ? 'EDITORIAL' : isZine ? 'ZINE #04' : isCityPop ? 'MIDNIGHT TOKYO' : isKinfolk ? 'SLOW LIVING' : template.name.split(' ').slice(0,2).join(' ')}
          </div>
          {!isKinfolk && <div className="text-[5px] tracking-wider mt-0.5" style={{ color: sc }}>{isVogue ? 'THE PORTRAIT ISSUE' : isZine ? 'DIY UNDERGROUND PRESS' : isCityPop ? 'SPECIAL FEATURE' : 'AUTUMN ISSUE'}</div>}
        </div>
        <div className="flex flex-1 gap-0.5 px-1.5 py-1 min-h-0">
          <div className="flex-[2] rounded-[2px] overflow-hidden relative" style={{ backgroundColor: tc + '15', border: `1px solid ${bc}30` }}>
            <div className="absolute inset-0 opacity-25 flex items-center justify-center">
              <div className="w-3/4 h-4/5 rounded-[1px]" style={{ backgroundColor: tc }} />
            </div>
            {isVogue && <div className="absolute bottom-0.5 left-0.5 px-0.5 text-[4px] font-mono" style={{ color: tc + 'cc' }}>COVER STORY</div>}
          </div>
          <div className="flex-1 flex flex-col gap-0.5">
            {[0,1,2].map(i => (
              <div key={i} className="flex-1 rounded-[2px] overflow-hidden relative" style={{ backgroundColor: tc + '10', border: `1px solid ${bc}20` }}>
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <div className="w-3/4 h-1/2 rounded-[1px]" style={{ backgroundColor: tc }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-2.5 pb-1 flex justify-between items-center">
          {isZine ? <span className="text-[4.5px] font-mono" style={{ color: sc }}>PHOTOCOPY ZINE • RIOT</span> : <span className="text-[4.5px] font-serif tracking-wider" style={{ color: sc }}>ISSN 2026-0001</span>}
          <div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className="h-1 w-1 rounded-full" style={{ backgroundColor: i===1 ? bc : bc+'50' }} />)}</div>
        </div>
      </div>
    );
  }

  // ── FILM / 35MM / VINTAGE ─────────────────────────────────
  if (theme === 'film_35mm') {
    const isVHS = template.id === 'vhs_glitch_retro';
    const isSuper8 = template.id === 'super8_film_warm';
    const isCassette = template.id === 'retro_indie_cassette';
    return (
      <div className="h-36 w-full rounded-xl overflow-hidden select-none relative" style={{ backgroundColor: template.backgroundColor, border: `2px solid ${bc}` }}>
        <div className="absolute left-0.5 inset-y-0 flex flex-col justify-evenly py-1 z-10">
          {[0,1,2,3,4].map(i=><div key={i} className="w-1.5 h-2 rounded-[1px] bg-black/50 border border-white/20" />)}
        </div>
        <div className="absolute right-0.5 inset-y-0 flex flex-col justify-evenly py-1 z-10">
          {[0,1,2,3,4].map(i=><div key={i} className="w-1.5 h-2 rounded-[1px] bg-black/50 border border-white/20" />)}
        </div>
        <div className="absolute inset-x-3 inset-y-0 flex flex-col justify-between py-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[6px] font-mono font-bold tracking-widest uppercase" style={{ color: tc }}>
              {isVHS ? '▶ PLAY' : isSuper8 ? 'KODACHROME' : isCassette ? '◉ REC' : '35MM'}
            </span>
            <span className="text-[5px] font-mono" style={{ color: sc }}>
              {isVHS ? '1988' : isSuper8 ? 'REEL 3' : isCassette ? 'SIDE A' : 'ISO 400'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-0.5 flex-1 my-1">
            {[0,1,2,3].map(i=>(
              <div key={i} className="rounded-[1px] overflow-hidden relative flex items-center justify-center" style={{ backgroundColor: tc + '20', border: `1px solid ${tc}30` }}>
                <div className="w-3/4 h-3/5 rounded-[1px] opacity-30" style={{ backgroundColor: tc }} />
                <span className="absolute bottom-0.5 right-0.5 text-[4px] font-mono" style={{ color: sc + 'aa' }}>{String(i+1).padStart(2,'0')}▲</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center">
            {isVHS
              ? <><span className="text-[5px] font-mono" style={{ color: tc }}>HI-FI STEREO</span><span className="text-[5px] font-mono" style={{ color: sc }}>SP • 6H</span></>
              : isSuper8
              ? <><span className="text-[5px] font-mono" style={{ color: sc }}>SUPER 8mm</span><span className="text-[5px] font-mono" style={{ color: sc }}>TUNGSTEN 25</span></>
              : <><span className="text-[5px] font-mono" style={{ color: sc }}>SATU FRAME</span><span className="text-[5px] font-mono" style={{ color: sc }}>KODAK 400</span></>}
          </div>
        </div>
        {isVHS && <div className="absolute inset-x-3 top-1/3 h-[2px] opacity-50" style={{ backgroundColor: '#2dd4bf' }} />}
      </div>
    );
  }

  // ── RETRO ARCADE ─────────────────────────────────────────
  if (theme === 'retro_arcade') {
    return (
      <div className="h-36 w-full rounded-xl overflow-hidden select-none relative flex flex-col" style={{ backgroundColor: template.backgroundColor, border: `3px solid ${bc}` }}>
        <div className="px-2 pt-1.5 flex items-center justify-between border-b border-slate-400/40">
          <span className="text-[7px] font-mono font-black tracking-widest" style={{ color: '#14532d' }}>PRESS START</span>
          <div className="flex gap-0.5">{[0,1].map(i=><div key={i} className="h-1.5 w-1.5 rounded-full border border-slate-500" style={{ backgroundColor: i===0 ? '#14532d' : 'transparent' }} />)}</div>
        </div>
        <div className="flex-1 px-1.5 py-1 grid grid-cols-2 gap-0.5">
          {[0,1,2,3].map(i=>(
            <div key={i} className="rounded-[1px] relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#14532d20', border: '1px solid #14532d50' }}>
              <div className="grid grid-cols-4 gap-px w-4/5 h-4/5 opacity-40">
                {Array.from({length:16}).map((_,j)=><div key={j} className="rounded-[0.5px]" style={{ backgroundColor: j%3===0 ? '#14532d' : '#334155' }} />)}
              </div>
              <span className="absolute top-0.5 left-0.5 text-[4px] font-mono" style={{ color: '#14532d' }}>P{i+1}</span>
            </div>
          ))}
        </div>
        <div className="px-2 pb-1.5 flex justify-between">
          <span className="text-[5.5px] font-mono font-bold" style={{ color: '#334155' }}>SCORE</span>
          <span className="text-[5.5px] font-mono font-bold" style={{ color: '#14532d' }}>99999</span>
          <span className="text-[5.5px] font-mono font-bold" style={{ color: '#334155' }}>LEVEL 99</span>
        </div>
      </div>
    );
  }

  // ── WEDDING / BOTANICAL ───────────────────────────────────
  if (theme === 'wedding_botanical') {
    const isBlush = template.id === 'engagement_blush_lace';
    const isRoyal = template.id === 'royal_golden_nuptial';
    return (
      <div className="h-36 w-full rounded-xl overflow-hidden select-none relative flex flex-col" style={{ backgroundColor: template.backgroundColor, border: `2px solid ${bc}` }}>
        <div className="absolute top-1 left-1 text-[8px] leading-none select-none" style={{ color: bc }}>❧</div>
        <div className="absolute top-1 right-1 text-[8px] leading-none select-none" style={{ color: bc }}>☙</div>
        <div className="absolute bottom-1 left-1 text-[8px] leading-none select-none" style={{ color: bc }}>☙</div>
        <div className="absolute bottom-1 right-1 text-[8px] leading-none select-none" style={{ color: bc }}>❧</div>
        <div className="px-4 pt-2.5 text-center">
          <div className="text-[5px] uppercase tracking-[0.4em] font-serif mb-0.5" style={{ color: sc }}>
            {isBlush ? 'She Said Yes' : isRoyal ? 'Royal Ceremony' : 'The Wedding'}
          </div>
          <div className="text-[9px] font-serif font-bold tracking-wider truncate" style={{ color: tc }}>
            {isRoyal ? 'ROYAL NUPTIAL' : isBlush ? 'ENGAGEMENT' : 'FOREVER & ALWAYS'}
          </div>
          <div className="flex items-center gap-1 justify-center mt-0.5">
            <div className="h-px flex-1" style={{ backgroundColor: bc + '80' }} />
            <span className="text-[6px]" style={{ color: bc }}>{isRoyal ? '♛' : isBlush ? '💍' : '✿'}</span>
            <div className="h-px flex-1" style={{ backgroundColor: bc + '80' }} />
          </div>
        </div>
        <div className="flex-1 px-3 py-1 grid grid-cols-4 gap-0.5">
          {[0,1,2,3].map(i=>(
            <div key={i} className="rounded-[2px] relative overflow-hidden" style={{ backgroundColor: tc + '12', border: `1.5px solid ${bc}` }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-25">
                <div className="w-3/4 h-4/5 rounded-[1px]" style={{ backgroundColor: tc }} />
              </div>
            </div>
          ))}
        </div>
        <div className="pb-2 text-center">
          <span className="text-[5px] font-serif tracking-widest" style={{ color: sc }}>
            {isBlush ? 'dua hati bertaut' : isRoyal ? 'kebahagiaan abadi' : 'janji suci cinta abadi'}
          </span>
        </div>
      </div>
    );
  }

  // ── POSTCARD / TRAVEL ─────────────────────────────────────
  if (theme === 'postcard_airmail') {
    const isRail = template.id === 'japan_train_ticket';
    const isTropical = template.id === 'bali_tropical_breeze';
    const isMountain = template.id === 'mountain_mist_forest';
    const isAirmail = !isRail && !isTropical && !isMountain;
    return (
      <div className="h-36 w-full rounded-xl overflow-hidden select-none relative flex flex-col" style={{ backgroundColor: template.backgroundColor, border: `2px solid ${bc}` }}>
        {isAirmail && <div className="h-2 w-full" style={{ background: 'repeating-linear-gradient(45deg, #dc2626, #dc2626 4px, #1d4ed8 4px, #1d4ed8 8px)' }} />}
        {(isRail || isTropical || isMountain) && <div className="h-1.5 w-full" style={{ backgroundColor: bc }} />}
        <div className="flex justify-between items-center px-2 pt-1">
          <div>
            <span className="text-[7px] font-black uppercase tracking-wider block" style={{ color: tc }}>
              {isRail ? 'SPECIAL EXPRESS' : isTropical ? 'SUNSET SHORE' : isMountain ? 'HIGHLAND' : 'PAR AVION'}
            </span>
            <span className="text-[4.5px] font-mono" style={{ color: sc }}>
              {isRail ? 'CAR 04 • SEAT A1' : isTropical ? 'BALI ESCAPE' : isMountain ? 'PINE CANOPY' : 'AIRMAIL'}
            </span>
          </div>
          {isAirmail && <span className="border text-[5px] font-bold px-1 rounded" style={{ borderColor: '#dc2626', color: '#dc2626' }}>AIR MAIL</span>}
          {isRail && <div className="text-right"><span className="text-[5px] font-mono block" style={{ color: sc }}>SEAT</span><span className="text-[8px] font-black" style={{ color: tc }}>A1</span></div>}
        </div>
        <div className="mx-2 my-0.5 border-t border-dashed" style={{ borderColor: tc + '40' }} />
        <div className="flex-1 px-2 py-0.5 grid grid-cols-4 gap-0.5">
          {[0,1,2,3].map(i=>(
            <div key={i} className="rounded-[2px] relative overflow-hidden" style={{ backgroundColor: tc + '18', border: `1px solid ${bc}50` }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-25">
                <div className="w-3/4 h-4/5 rounded-[1px]" style={{ backgroundColor: tc }} />
              </div>
              {isAirmail && <div className="absolute bottom-0.5 right-0.5 w-2 h-1.5 rounded-[0.5px] opacity-50" style={{ backgroundColor: bc }} />}
            </div>
          ))}
        </div>
        {isAirmail && <div className="h-2 w-full" style={{ background: 'repeating-linear-gradient(-45deg, #1d4ed8, #1d4ed8 4px, #dc2626 4px, #dc2626 8px)' }} />}
        {(isRail || isTropical || isMountain) && <div className="h-1.5 w-full" style={{ backgroundColor: bc + '80' }} />}
      </div>
    );
  }

  // ── COMIC / MANGA ─────────────────────────────────────────
  if (theme === 'comic_screentone') {
    const isManga = template.id === 'shonen_manga_halftone';
    const isPopArt = template.id === 'pop_art_roy';
    return (
      <div className="h-36 w-full rounded-xl overflow-hidden select-none relative" style={{ backgroundColor: template.backgroundColor, border: `${isManga ? 3 : 4}px solid ${bc}` }}>
        {isPopArt && (
          <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
        )}
        {isManga && (
          <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 6px, #000 6px, #000 6.5px)' }} />
        )}
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5 h-full">
          <div className="relative overflow-hidden rounded-[1px]" style={{ gridColumn: '1', gridRow: '1 / 3', backgroundColor: tc + '10', border: `2px solid ${bc}` }}>
            <div className="absolute inset-0 flex items-center justify-center opacity-25">
              <div className="w-3/4 h-4/5" style={{ backgroundColor: tc }} />
            </div>
            {isManga && <div className="absolute top-1 left-1 bg-white border border-black px-0.5 py-0.5"><span className="text-[5px] font-black leading-none" style={{ color: '#000' }}>CHAPTER 01</span></div>}
            {isPopArt && <div className="absolute top-1 left-1 px-1 py-0.5" style={{ backgroundColor: '#b91c1c' }}><span className="text-[7px] font-black leading-none text-white">POW!</span></div>}
          </div>
          {[0,1].map(i=>(
            <div key={i} className="relative overflow-hidden rounded-[1px]" style={{ backgroundColor: tc + '08', border: `2px solid ${bc}` }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="w-3/4 h-3/4" style={{ backgroundColor: tc }} />
              </div>
              {isPopArt && i===1 && <div className="absolute inset-0 flex items-center justify-center"><span className="text-[9px] font-black" style={{ color: '#b91c1c' }}>WOW!</span></div>}
            </div>
          ))}
        </div>
        <div className="absolute bottom-0.5 right-1">
          <span className="text-[5px] font-black" style={{ color: bc }}>{isManga ? '→ NEXT PAGE' : 'AMAZING!'}</span>
        </div>
      </div>
    );
  }

  // ── K-POP PHOTOCARD ──────────────────────────────────────
  if (theme === 'kpop_photocard') {
    const isLightstick = template.id === 'lightstick_concert_night';
    return (
      <div className="h-36 w-full rounded-xl overflow-hidden select-none relative flex flex-col" style={{ backgroundColor: template.backgroundColor, border: `2px solid ${bc}` }}>
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${bc}60, ${bc}, ${bc}60)` }} />
        <div className="px-2 pt-1 text-center">
          <div className="text-[5px] uppercase tracking-[0.5em] mb-0.5" style={{ color: sc }}>
            {isLightstick ? '⭐ STADIUM TOUR' : '✦ OFFICIAL PHOTOCARD ✦'}
          </div>
          <div className="text-[9px] font-bold tracking-widest truncate" style={{ color: tc }}>
            {isLightstick ? 'OCEAN OF LIGHTS' : 'SPECIAL DROP'}
          </div>
        </div>
        <div className="flex-1 px-2 py-1 grid grid-cols-4 gap-0.5">
          {[0,1,2,3].map(i=>(
            <div key={i} className="rounded-[3px] relative overflow-hidden flex flex-col" style={{ backgroundColor: tc + '15', border: `1.5px solid ${bc}` }}>
              <div className="flex-1 flex items-center justify-center opacity-30">
                <div className="w-3/4 h-4/5 rounded-[1px]" style={{ backgroundColor: tc }} />
              </div>
              <div className="py-0.5 text-center">
                <div className="text-[4px] font-bold" style={{ color: tc }}>NO.{String(i+1).padStart(2,'0')}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-2 pb-1.5 flex justify-between items-center">
          <div className="flex gap-0.5">{[0,1,2].map(i=><div key={i} className="h-1 w-1 rounded-full" style={{ backgroundColor: bc, opacity: i===1 ? 1 : 0.4 }} />)}</div>
          <span className="text-[4.5px] font-bold tracking-widest" style={{ color: sc }}>
            {isLightstick ? 'SATU FRAME FANDOM' : 'SATU FRAME OFFICIAL'}
          </span>
        </div>
      </div>
    );
  }

  // ── ROMANTIC / MINIMAL / BIRTHDAY / GRADUATION / REUNION / CONCERT / DEFAULT ─
  const isRomantic = template.category === 'romantic';
  const isGrad = template.category === 'graduation';
  const isBirthday = template.category === 'birthday';
  const isConcert = template.category === 'concert';
  const isCyber = template.id === 'cyber_y2k';
  const isReunion = template.category === 'reunion';

  return (
    <div className="h-36 w-full rounded-xl overflow-hidden select-none relative flex flex-col" style={{ backgroundColor: template.backgroundColor, border: `2px solid ${bc}` }}>
      <div className="h-1 w-full" style={{ background: isRomantic ? `linear-gradient(90deg, ${bc}00, ${bc}, ${bc}00)` : isCyber ? 'linear-gradient(90deg, #38bdf8, #818cf8, #38bdf8)' : bc }} />
      <div className="px-2.5 pt-1.5 pb-1 text-center">
        {isRomantic && <div className="text-[7px] mb-0.5" style={{ color: bc }}>♡ ♡ ♡</div>}
        {isGrad && <div className="text-[5px] uppercase tracking-[0.5em] mb-0.5" style={{ color: sc }}>CLASS OF 2026</div>}
        {isBirthday && <div className="text-[6px] mb-0.5">🎂 🎉 🎈</div>}
        {isConcert && <div className="text-[5px] uppercase tracking-widest mb-0.5 font-mono" style={{ color: sc }}>LIVE ON STAGE</div>}
        {isCyber && <div className="text-[5px] uppercase tracking-widest mb-0.5 font-mono" style={{ color: '#38bdf8' }}>// SYSTEM ONLINE</div>}
        {isReunion && <div className="text-[5px] uppercase tracking-wider mb-0.5" style={{ color: sc }}>REUNITED</div>}
        <div className={`font-bold uppercase truncate ${isGrad ? 'text-[9px] tracking-widest' : isCyber ? 'text-[8px] font-mono tracking-widest' : 'text-[9px] tracking-wider'}`} style={{ color: tc }}>
          {template.headerText?.split('•')[0]?.trim() || template.name}
        </div>
        {isGrad && (
          <div className="flex items-center gap-1 justify-center mt-0.5">
            <div className="h-px w-6" style={{ backgroundColor: bc + '60' }} />
            <span className="text-[7px]" style={{ color: bc }}>✦</span>
            <div className="h-px w-6" style={{ backgroundColor: bc + '60' }} />
          </div>
        )}
      </div>
      <div className="flex-1 px-2 py-0.5 grid grid-cols-2 grid-rows-2 gap-0.5">
        {[0,1,2,3].map(i=>(
          <div key={i} className={`relative overflow-hidden ${isGrad ? 'rounded-[2px]' : isRomantic ? 'rounded-[3px]' : 'rounded-[1px]'}`}
            style={{ backgroundColor: tc + '15', border: `1px solid ${bc}${isCyber ? 'aa' : '50'}` }}>
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="w-3/4 h-4/5 rounded-[1px]" style={{ backgroundColor: tc }} />
            </div>
            {isRomantic && i===0 && <div className="absolute top-0.5 right-0.5 text-[6px]" style={{ color: bc + 'cc' }}>♡</div>}
            {isCyber && <div className="absolute top-0.5 left-0.5 text-[4px] font-mono" style={{ color: '#38bdf8aa' }}>[{String(i+1).padStart(2,'0')}]</div>}
          </div>
        ))}
      </div>
      <div className="px-2.5 pb-1.5 flex justify-between items-center">
        <span className="text-[5px] truncate flex-1" style={{ color: sc }}>
          {template.footerText?.substring(0, 28) || 'SATU FRAME'}
        </span>
        {isRomantic && <span className="text-[6px] ml-1" style={{ color: bc }}>♡</span>}
        {isGrad && <span className="text-[6px] ml-1" style={{ color: bc }}>✦</span>}
        {isCyber && <span className="text-[5px] font-mono ml-1" style={{ color: '#38bdf8' }}>EOF</span>}
      </div>
    </div>
  );
}

const playSyntheticBeep = (freq = 440, duration = 0.12) => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
};

interface HeroThemeConfig {
  id: 'film' | 'newspaper' | 'vogue' | 'blush';
  label: string;
  badge: string;
  bg: string;
  border: string;
  textColor: string;
  subtextColor: string;
  header: string;
  tag: string;
  sprockets?: boolean;
}

const HERO_THEMES: HeroThemeConfig[] = [
  {
    id: 'film',
    label: 'Film 35mm',
    badge: '🎞️',
    bg: '#18181b',
    border: '#3f3f46',
    textColor: '#fafafa',
    subtextColor: '#a1a1aa',
    header: '35MM KODACHROME ISO 400',
    tag: 'KODAK 400',
    sprockets: true,
  },
  {
    id: 'newspaper',
    label: 'Warta Koran',
    badge: '📰',
    bg: '#fbf7ee',
    border: '#d5c4a1',
    textColor: '#1c1917',
    subtextColor: '#57534e',
    header: 'THE VINTAGE CHRONICLE',
    tag: 'EDISI KHUSUS 1926',
    sprockets: false,
  },
  {
    id: 'vogue',
    label: 'Editorial Vogue',
    badge: '✦',
    bg: '#09090b',
    border: '#d4af37',
    textColor: '#fef3c7',
    subtextColor: '#b45309',
    header: 'HAUTE COUTURE EDITORIAL',
    tag: 'PARIS • MILAN',
    sprockets: false,
  },
  {
    id: 'blush',
    label: 'Wedding Blush',
    badge: '💍',
    bg: '#fff1f2',
    border: '#fecdd3',
    textColor: '#881337',
    subtextColor: '#fb7185',
    header: 'ETERNAL LOVE & MEMORY',
    tag: 'FOREVER & ALWAYS',
    sprockets: false,
  },
];

function HeroShowcaseStrip({
  themeConfig,
  countdownNum,
}: {
  themeConfig: HeroThemeConfig;
  countdownNum: number | null;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[310px] select-none">
      {/* Layer 2: Background secondary tilted photostrip */}
      <div className="absolute inset-0 translate-x-5 translate-y-3 rotate-6 rounded-2xl border border-zinc-700/60 bg-zinc-900/80 p-3 opacity-40 shadow-2xl backdrop-blur-sm pointer-events-none transition-transform duration-500">
        <div className="h-full w-full rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between p-2">
          <div className="text-[8px] font-mono text-zinc-400 tracking-widest text-center uppercase">
            SATU FRAME ARCHIVE #02
          </div>
          <div className="space-y-2 my-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[4/2.6] rounded bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-[8px] text-zinc-400"
              >
                Pose #{i + 1}
              </div>
            ))}
          </div>
          <div className="text-[7px] text-zinc-400 text-center font-mono">BANDUNG • JAKARTA</div>
        </div>
      </div>

      {/* Layer 1: Foreground Physical Photostrip with realistic paper feel */}
      <div
        className="relative -rotate-2 rounded-2xl p-3.5 sm:p-4 shadow-photostrip-warm transition-all duration-500 flex flex-col justify-between overflow-hidden"
        style={{
          backgroundColor: themeConfig.bg,
          border: `2px solid ${themeConfig.border}`,
          color: themeConfig.textColor,
        }}
      >
        {/* Washi tape at top center */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 washi-tape h-5 w-20 rounded-sm rotate-1 z-20 border border-white/20 pointer-events-none" />

        {/* Glossy glare reflection overlay */}
        <div className="photo-glossy-glare absolute inset-0 rounded-2xl z-10" />

        {/* Film sprockets if 35mm film */}
        {themeConfig.sprockets && (
          <>
            <div className="absolute left-1 inset-y-4 flex flex-col justify-between py-2 z-10">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-1.5 h-3 rounded-[1px] bg-black/60 border border-white/20" />
              ))}
            </div>
            <div className="absolute right-1 inset-y-4 flex flex-col justify-between py-2 z-10">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-1.5 h-3 rounded-[1px] bg-black/60 border border-white/20" />
              ))}
            </div>
          </>
        )}

        {/* Photostrip Header */}
        <div
          className={`pb-2 mb-2 border-b text-center ${themeConfig.sprockets ? 'px-3' : 'px-1'}`}
          style={{ borderColor: themeConfig.subtextColor + '40' }}
        >
          <div
            className="flex justify-between items-center text-[7px] font-mono tracking-widest uppercase mb-0.5"
            style={{ color: themeConfig.subtextColor }}
          >
            <span>{themeConfig.tag}</span>
            <span>VOL. 26</span>
          </div>
          <h4 className="font-bold uppercase tracking-widest text-[10px] sm:text-[11px] truncate">
            {themeConfig.header}
          </h4>
        </div>

        {/* 4 Photo Frames with Duo Portraits */}
        <div className={`space-y-1.5 my-1 ${themeConfig.sprockets ? 'px-2' : ''}`}>
          {[
            { pose: 'Pose 01: Tatap & Senyum', sub: 'Kamera Sinkron' },
            { pose: 'Pose 02: Bentuk Hati Berdua', sub: 'Tangan Menyatu' },
            { pose: 'Pose 03: Ekspresi Ceria Lucu', sub: 'Tawa Lepas' },
            { pose: 'Pose 04: Dekat & Hangat', sub: 'Satu Momen' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="relative aspect-[4/2.5] rounded-xl overflow-hidden border p-1 flex flex-col justify-between group transition"
              style={{
                backgroundColor:
                  themeConfig.bg === '#18181b' || themeConfig.bg === '#09090b'
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.06)',
                borderColor: themeConfig.border + '60',
              }}
            >
              {/* Duo Portraits Silhouette Simulation */}
              <div className="flex-1 grid grid-cols-2 gap-1 relative overflow-hidden rounded-lg">
                {/* Left person */}
                <div className="rounded bg-black/30 flex flex-col items-center justify-center p-1 relative">
                  <div className="w-5 h-5 rounded-full border border-current opacity-40 mb-0.5 flex items-center justify-center text-[7px]">
                    👤
                  </div>
                  <span className="text-[7px] font-medium opacity-80">Kamu</span>
                </div>
                {/* Right person */}
                <div className="rounded bg-black/30 flex flex-col items-center justify-center p-1 relative">
                  <div className="w-5 h-5 rounded-full border border-current opacity-40 mb-0.5 flex items-center justify-center text-[7px]">
                    👤
                  </div>
                  <span className="text-[7px] font-medium opacity-80">Pasangan</span>
                </div>

                {/* Shutter Sync Indicator pill */}
                <div className="absolute inset-x-0 bottom-0.5 flex justify-center">
                  <span className="rounded-full bg-black/60 px-1.5 py-0.2 text-[6.5px] font-mono text-teal-300 border border-teal-500/30 backdrop-blur-sm">
                    {item.pose}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Photostrip Footer & Barcode */}
        <div
          className={`pt-2 mt-1.5 border-t flex items-center justify-between text-[7.5px] font-mono ${
            themeConfig.sprockets ? 'px-3' : 'px-1'
          }`}
          style={{ borderColor: themeConfig.subtextColor + '40', color: themeConfig.subtextColor }}
        >
          <div className="flex flex-col">
            <span className="font-bold text-[8px]" style={{ color: themeConfig.textColor }}>
              JAKARTA & BANDUNG
            </span>
            <span>22 SEPTEMBER 2026</span>
          </div>
          <div className="flex items-center gap-0.5 opacity-70">
            <div className="h-4 w-0.5 bg-current" />
            <div className="h-4 w-1 bg-current" />
            <div className="h-4 w-0.5 bg-current" />
            <div className="h-4 w-1.5 bg-current" />
            <div className="h-4 w-0.5 bg-current" />
          </div>
        </div>

        {/* Live Shutter Countdown Overlay if Testing */}
        {countdownNum !== null && (
          <div className="absolute inset-0 z-30 rounded-2xl bg-black/75 flex flex-col items-center justify-center text-white backdrop-blur-sm">
            <div className="text-7xl font-black animate-bounce text-teal-300 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
              {countdownNum}
            </div>
            <p className="mt-2 text-xs font-semibold text-zinc-300">Tahan pose...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [joinCode, setJoinCode] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Hero Interactive States
  const [selectedHeroTheme, setSelectedHeroTheme] = useState<'film' | 'newspaper' | 'vogue' | 'blush'>('film');
  const [isTestingShutter, setIsTestingShutter] = useState(false);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [shutterToast, setShutterToast] = useState<string | null>(null);
  const [isHeroFlashing, setIsHeroFlashing] = useState(false);

  useEffect(() => {
    trackEvent('landing_view');
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    if (!clean) return;
    router.push(`/room/${clean}`);
  };

  const handleTestShutter = () => {
    if (isTestingShutter) return;
    setIsTestingShutter(true);
    setShutterToast(null);

    let current = 3;
    setCountdownNum(3);
    playSyntheticBeep(440, 0.12);

    const timer = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdownNum(current);
        playSyntheticBeep(current === 2 ? 554 : 659, 0.12);
      } else {
        clearInterval(timer);
        setCountdownNum(null);
        setIsHeroFlashing(true);
        playSyntheticBeep(880, 0.25);
        confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => {
          setIsHeroFlashing(false);
          setIsTestingShutter(false);
          setShutterToast('📸 Cekrek! Kedua kamera lokal menjepret di detik yang sama (ΔT 0ms)!');
          setTimeout(() => setShutterToast(null), 4500);
        }, 160);
      }
    }, 900);
  };

  const activeHeroThemeConfig =
    HERO_THEMES.find((t) => t.id === selectedHeroTheme) || HERO_THEMES[0];

  const filteredTemplates =
    selectedCategory === 'all'
      ? PHOTO_TEMPLATES
      : PHOTO_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-teal-500 selection:text-white bg-studio-radial">
      {/* Shutter Screen Flash Simulation */}
      {isHeroFlashing && <div className="fixed inset-0 z-50 screen-flash bg-white pointer-events-none" />}

      {/* Sticky Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Logo & Tagline */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700/80 p-1 shadow-sm overflow-hidden group-hover:border-teal-500/60 transition">
              <Image
                src="/logo-icon.png"
                alt="Satu Frame Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white sm:text-lg group-hover:text-teal-300 transition">
                SATU FRAME
              </span>
              <p className="hidden text-[11px] text-zinc-400 sm:block">Dua tempat, satu momen</p>
            </div>
          </Link>

          {/* Nav Links (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-300">
            <a href="#katalog" className="transition hover:text-white min-h-[44px] flex items-center">
              Katalog Frame
            </a>
            <a href="#cara-kerja" className="transition hover:text-white min-h-[44px] flex items-center">
              Cara Kerja
            </a>
            <Link href="/timeline" className="transition hover:text-white min-h-[44px] flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-amber-400" />
              <span>Linimasa Pasangan</span>
            </Link>
            <Link href="/admin" className="transition hover:text-white min-h-[44px] flex items-center">
              Dashboard
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#gabung"
              className="hidden sm:inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-zinc-700 hover:text-white min-h-[44px]"
            >
              Masuk Kode
            </a>
            <Link
              href="/create"
              className="btn-shutter inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition min-h-[44px]"
            >
              <span>Buka Studio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="overflow-x-hidden">
        {/* Shutter Toast Banner if active */}
        {shutterToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-11/12 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 p-3.5 text-center text-xs font-semibold text-emerald-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
            {shutterToast}
          </div>
        )}

        {/* Hero Section */}
        <section className="relative mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-24 lg:px-8 lg:pt-24 lg:pb-28">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Narrative Column */}
            <div className="space-y-6 text-center lg:col-span-7 lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold tracking-wider text-teal-400 uppercase">
                <span>Virtual Photobooth Jarak Jauh</span>
                <span className="text-zinc-600">•</span>
                <span>Safari & Chrome</span>
              </div>

              {/* H1 Main Heading with Display Serif */}
              <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-white leading-[1.08]">
                Dua Tempat. <br />
                <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-teal-400 to-amber-300">
                  Satu Bingkai Kenangan.
                </span>
              </h1>

              {/* Subheading */}
              <p className="mx-auto max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-300 lg:mx-0">
                Jarak boleh terbentang ratusan kilometer, tapi tawa berdua abadi dalam detik yang sama.
                Cukup buka dari peramban di ponsel masing-masing tanpa install aplikasi, pose berdua
                dengan shutter sinkron, dan miliki photostrip autentik dalam 2 menit.
              </p>

              {/* Action Buttons with Tactile Shutter */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 lg:justify-start">
                <Link
                  href="/create"
                  className="btn-shutter flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl px-8 py-4 text-base font-bold text-white min-h-[54px] shadow-2xl group"
                >
                  <Camera className="h-5 w-5 text-teal-200 group-hover:rotate-12 transition-transform" />
                  <span>Mulai Sesi Foto Berdua</span>
                  <ArrowRight className="h-4 w-4 text-teal-200 group-hover:translate-x-1 transition-transform" />
                </Link>

                <button
                  type="button"
                  onClick={handleTestShutter}
                  disabled={isTestingShutter}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/90 px-6 py-4 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 transition active:scale-[0.98] min-h-[54px]"
                >
                  <Play className={`h-4 w-4 text-amber-400 ${isTestingShutter ? 'animate-spin' : ''}`} />
                  <span>{isTestingShutter ? 'Menghitung Mundur...' : 'Uji Sensasi Shutter 3-2-1'}</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-zinc-900/80 text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Privat 24 Jam</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Pemusnahan file mentah otomatis (UU PDP)</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Smartphone className="h-4 w-4 text-teal-400 shrink-0" />
                    <span>Zero Install</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Langsung di Safari, Chrome, atau Laptop</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Camera className="h-4 w-4 text-sky-400 shrink-0" />
                    <span>Resolusi HD</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Sensor kamera lokal bukan rekaman call</p>
                </div>
              </div>
            </div>

            {/* Right Visual Column: Living Physical Photostrip Showcase */}
            <div className="flex flex-col items-center justify-center lg:col-span-5 space-y-4">
              {/* Quick Interactive Theme Switcher Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-1.5 backdrop-blur-md">
                {HERO_THEMES.map((theme) => {
                  const isActive = selectedHeroTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedHeroTheme(theme.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition min-h-[44px] ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-sm shadow-teal-950/50 scale-105'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                      }`}
                    >
                      <span>{theme.badge}</span>
                      <span>{theme.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Physical Photostrip with Layers */}
              <HeroShowcaseStrip
                themeConfig={activeHeroThemeConfig}
                countdownNum={countdownNum}
              />
            </div>
          </div>
        </section>

        {/* Studio Guide / Workflow Section */}
        <section id="cara-kerja" className="border-t border-zinc-900 bg-zinc-900/30 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <span className="text-xs font-semibold text-teal-400 tracking-wider uppercase">
                ALUR STUDIO BILIK FOTO
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Pengalaman Bilik Foto Fisik di Layar Ponsel
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-zinc-300">
                Dirancang langsung tanpa hambatan registrasi akun. Masuk studio dalam hitungan detik.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-950/50 border border-teal-900/60 text-teal-300 font-bold text-sm">
                  1
                </div>
                <h3 className="text-base font-bold text-white">Masuk Bilik & Tautkan Kamera</h3>
                <p className="text-xs leading-relaxed text-zinc-300">
                  Pilih tema kertas foto favorit Anda. Sistem membuat tautan privat dan kode 8 karakter untuk Anda kirimkan ke pasangan. Tatap muka langsung aktif melalui video call real-time.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-950/50 border border-teal-900/60 text-teal-300 font-bold text-sm">
                  2
                </div>
                <h3 className="text-base font-bold text-white">Hitung Mundur Shutter Sinkron</h3>
                <p className="text-xs leading-relaxed text-zinc-300">
                  Ikuti panduan 4 pose tematik. Hitung mundur audio 3-2-1 dan blitz visual memicu sensor kamera lokal kedua ponsel menjepret di detik yang sama persis.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-950/50 border border-teal-900/60 text-teal-300 font-bold text-sm">
                  3
                </div>
                <h3 className="text-base font-bold text-white">Kertas Foto Fisik & Cetak HD</h3>
                <p className="text-xs leading-relaxed text-zinc-300">
                  Photostrip langsung tersusun otomatis. Unduh format Strip, Story Instagram, atau Feed beresolusi tinggi 300 DPI, atau simpan ke Linimasa Memori Pasangan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Thematic Frame Showcase Section */}
        <section id="katalog" className="py-16 sm:py-24 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-semibold text-teal-400 tracking-wider uppercase">
                KATALOG TEMATIK
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                40 Desain Frame Eksklusif untuk Setiap Momen
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-zinc-300">
                Pilih gaya estetika autentik (Koran, Majalah Editorial, Wedding, Retro, dll) untuk momen berhargamu.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'newspaper', label: 'Koran' },
                { id: 'magazine', label: 'Majalah' },
                { id: 'romantic', label: 'Pasangan' },
                { id: 'wedding', label: 'Wedding' },
                { id: 'graduation', label: 'Wisuda' },
                { id: 'reunion', label: 'Reuni' },
                { id: 'birthday', label: 'Ultah' },
                { id: 'travel', label: 'Wisata' },
                { id: 'concert', label: 'Konser' },
                { id: 'comic', label: 'Komik' },
                { id: 'fandom', label: 'K-Pop' },
                { id: 'vintage', label: 'Vintage' },
                { id: 'classic', label: 'Klasik' },
                { id: 'minimal', label: 'Minimalis' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition min-h-[44px] ${
                    selectedCategory === tab.id
                      ? 'bg-teal-600 text-white shadow-sm shadow-teal-950/50'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid (1-col mobile, 2-col tablet, 3-col desktop) */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-teal-700/60 hover:bg-zinc-900 shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-teal-300 border border-zinc-700/60">
                      {template.eventTag || template.category}
                    </span>
                    {template.isPremium && (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                        {template.badge || 'Eksklusif'}
                      </span>
                    )}
                  </div>

                  {/* Thematic Visual Graphic Frame Mockup */}
                  <TemplateShowcaseVisual template={template} />

                  <h3 className="mt-4 text-base font-bold text-white">{template.name}</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    {template.description || 'Proporsi strip vertikal 1:3, kompatibel dengan Instagram Story (9:16) dan Feed (4:5).'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-800/80">
                  <Link
                    href={`/create?template=${template.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-100 transition hover:bg-teal-600 hover:text-white min-h-[44px]"
                  >
                    <span>Pilih Frame Ini</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Memory Vault / Linimasa Pasangan Teaser */}
        <section className="border-t border-zinc-900 bg-zinc-900/30 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 sm:p-12 lg:p-16">
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-7">
                  <div className="inline-flex items-center gap-2 rounded-full bg-teal-950/60 px-3 py-1 text-xs font-semibold text-teal-300 border border-teal-900/80">
                    <Heart className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    <span>Memory Vault Pasangan</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
                    Kumpulkan Setiap Strip Foto dalam Satu Linimasa Abadi
                  </h2>
                  <p className="text-xs sm:text-sm leading-relaxed text-zinc-300">
                    Setiap photostrip yang Anda ambil berdua dapat dikaitkan ke Linimasa Memori Pasangan.
                    Lengkap dengan kalkulator hari jadian otomatis, hitung mundur perayaan monthsary,
                    dan galeri kenangan bersama yang dapat dibuka kapan pun tanpa takut hilang.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/timeline"
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-xs font-semibold text-white shadow-lg shadow-teal-950/50 transition hover:bg-teal-500 min-h-[48px]"
                    >
                      <span>Lihat Contoh Linimasa Pasangan</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5 flex justify-center">
                  <div className="w-full max-w-xs rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">Hari Jadian</span>
                      </div>
                      <span className="text-xs font-bold text-amber-400">142 Hari Bersama</span>
                    </div>
                    <div className="rounded-xl bg-zinc-950 p-3 border border-zinc-800/80 space-y-1">
                      <span className="text-[11px] text-zinc-400 block">Monthsary Berikutnya</span>
                      <span className="text-sm font-bold text-white">8 Hari Lagi</span>
                    </div>
                    <div className="rounded-xl bg-zinc-950 p-3 border border-zinc-800/80 space-y-1">
                      <span className="text-[11px] text-zinc-400 block">Koleksi Strip Tersimpan</span>
                      <span className="text-sm font-bold text-white">3 Momen Terabadikan</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Join Section */}
        <section id="gabung" className="py-16 sm:py-24 mx-auto max-w-3xl px-4 text-center">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 sm:p-12 shadow-2xl backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 text-teal-400">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Gabung ke Sesi Foto Pasangan
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-zinc-400">
              Menerima kode 8 karakter dari sahabat atau pasanganmu? Masukkan di bawah untuk langsung
              terhubung ke studio photobooth.
            </p>

            <form onSubmit={handleJoin} className="mx-auto mt-6 flex max-w-md flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Contoh: 7KPRHP7S"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                maxLength={8}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-center font-mono text-base font-bold uppercase tracking-widest text-white placeholder-zinc-400 focus:border-teal-500 focus:outline-none min-h-[48px]"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="rounded-xl bg-teal-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-teal-950/50 transition hover:bg-teal-500 active:scale-95 disabled:opacity-40 min-h-[48px]"
              >
                Masuk Room
              </button>
            </form>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="border-t border-zinc-900 bg-zinc-900/30 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-xs font-semibold text-teal-400 tracking-wider uppercase">
                PERTANYAAN UMUM
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Hal yang Sering Ditanyakan
              </h2>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-bold text-white hover:text-teal-300 min-h-[48px]"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-zinc-400 transition-transform ${
                          isOpen ? 'rotate-180 text-teal-400' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs leading-relaxed text-zinc-300 border-t border-zinc-900/80 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Global Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8 text-zinc-400">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 overflow-hidden">
              <Image
                src="/logo-icon.png"
                alt="Satu Frame Icon"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-white">SATU FRAME v2.1</span>
              <p className="text-[11px] text-zinc-400">Platform Virtual Photobooth Real-Time Indonesia</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <Link href="/create" className="px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition min-h-[44px] inline-flex items-center">
              Mulai Sesi
            </Link>
            <Link href="/timeline" className="px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition min-h-[44px] inline-flex items-center">
              Linimasa Pasangan
            </Link>
            <Link href="/admin" className="px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition min-h-[44px] inline-flex items-center">
              Dashboard
            </Link>
            <a href="#katalog" className="px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition min-h-[44px] inline-flex items-center">
              Katalog Frame
            </a>
          </div>

          <p className="text-[11px] text-zinc-400 text-center md:text-right">
            Privat & Patuh UU PDP No. 27/2022. Foto mentah otomatis dihapus dalam 24 jam.
          </p>
        </div>
      </footer>
    </div>
  );
}
