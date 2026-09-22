# PRD - SATU FRAME v2.2 (Technical Edition)

| Field | Value |
|---|---|
| **Product** | Satu Frame |
| **Category** | Consumer SaaS / Social Experience Platform |
| **Core Product** | Virtual / Online Photobooth (2 orang, real-time, browser-only) |
| **Primary Market** | Indonesia |
| **Primary Audience** | Pasangan LDR, sahabat beda kota/negara (usia 17-30) |
| **Business Model** | Free-to-try, Pay-to-keep (HD tanpa watermark) |
| **Pricing (hipotesis awal)** | 1 Sesi Rp15.000 · 3 Sesi Rp35.000 |
| **Status** | Pre-MVP / Technical Specification |
| **Versi dokumen** | 2.2 |
| **Bahasa produk** | Indonesia (utama), Inggris (sekunder) |

> **Status validasi harga:** Rp15K/Rp35K didukung sinyal awal (n=5 teman, non-komitmen). Diperlakukan sebagai **hipotesis** dan wajib diuji dengan transaksi nyata (lihat §22).

---

## DAFTAR ISI

1. Visi & Positioning
2. Masalah & Target Pengguna
3. Prinsip Produk
4. Strategi Diferensiasi
5. Model Bisnis & Entitlement
6. Scope (MVP / V1 / Out-of-Scope)
7. User Flow Utama
8. Arsitektur Sistem
9. Sinkronisasi Kamera & Shutter Lag (Area Kritis 1)
10. Rendering Canvas & Batasan Memori (Area Kritis 2)
11. State Machine & Pemulihan Sesi (Area Kritis 3)
12. Pembayaran QRIS & Deep Link E-Wallet (Area Kritis 4)
13. In-App Browser & Kompatibilitas
14. Privasi, Consent & Kepatuhan UU PDP
15. Data Model
16. API & Event Contract
17. Security & Anti-Abuse
18. Analytics & Metrik
19. Unit Economics
20. Risiko & Mitigasi
21. Non-Functional Requirements
22. Rencana Validasi & Kriteria Kill/Pivot
23. Roadmap
24. Acceptance Criteria MVP
25. Appendix

---

# 1. VISI & POSITIONING

**Tagline:** *Dua tempat. Satu momen.*

**Positioning statement:**
> Untuk pasangan dan teman yang berjauhan, Satu Frame adalah photobooth online yang membuat foto bareng terasa seperti benar-benar di satu tempat: tanpa install, tanpa daftar, dalam < 2 menit.

**Visi jangka panjang:** digital memory platform untuk orang yang ingin mengabadikan momen bersama meski tidak berada di tempat yang sama.

**Bukan:** video call app, editor foto, social network, marketplace.

---

# 2. MASALAH & TARGET PENGGUNA

## 2.1 Masalah
Screenshot video call menghasilkan foto buram, komposisi tidak terkontrol, dan tidak terasa sebagai "momen". Belum ada ritual visual yang layak dipajang/dibagikan.

## 2.2 Persona

| Persona | Deskripsi | Job-to-be-Done |
|---|---|---|
| **Rara (22)** | LDR Jakarta–Malang | "Aku ingin bukti visual bahwa kami merayakan momen ini bersama." |
| **Dimas (25)** | Sahabat beda kota | "Ulang tahun sahabatku harus terasa spesial walau aku jauh." |
| **Pasangan beda negara** | Beda zona waktu | "Aku ingin ritual bulanan yang bisa kami tunggu." |

## 2.3 Use case utama
Anniversary, monthsary, ulang tahun, Valentine, perpisahan, reuni, date night, kelulusan.

---

# 3. PRINSIP PRODUK

1. **Zero Friction**: tanpa install, tanpa registrasi wajib; partner cukup buka link.
2. **Mobile-First**: sempurna di Android Chrome, iOS Safari, Samsung Internet; desktop didukung.
3. **Emotional**: bahasa hangat ("Orangmu sudah di sini ❤️"), bukan bahasa meeting software.
4. **Shareable by Design**: output = iklan (Story 1080×1920, Feed 1080×1350, Square 1080×1080).
5. **Fast**: landing → foto pertama < 2 menit (median).
6. **Quality-First**: foto diambil lokal pada resolusi tertinggi; jaringan tidak pernah menjadi sumber kualitas.
7. **Resilient**: gangguan koneksi/tab/pembayaran tidak boleh menghilangkan foto yang sudah diambil.

---

# 4. STRATEGI DIFERENSIASI

Fitur dasar (room, countdown sinkron, template, download) sudah dimiliki kompetitor (Seeyuu, Snapmiles, LensBooth). Moat Satu Frame dibangun di:

| Pilar | Deskripsi |
|---|---|
| **A. Kualitas hasil** | Capture lokal full-res di tiap perangkat, bukan screenshot stream. |
| **B. Reliabilitas** | Sesi dapat di-resume; foto tersimpan incremental; pembayaran tidak memutus sesi. |
| **C. Ritual & Retensi** | Kalender Momen, Frame Series/Timeline (V1). |
| **D. Kurasi visual** | Sedikit template, kualitas desain tinggi, bukan 30 template biasa. |
| **E. Switching cost emosional** | Timeline memory yang terakumulasi (V1). |

---

# 5. MODEL BISNIS & ENTITLEMENT

## 5.1 Free-to-Try, Pay-to-Keep

| Fitur | Gratis | 1 Sesi (Rp15K) | 3 Sesi (Rp35K) |
|---|---|---|---|
| Buat room & foto bareng | ✅ | ✅ | ✅ |
| Preview hasil | ✅ | ✅ | ✅ |
| Download | Resolusi rendah (720px sisi panjang) + watermark | HD (full) tanpa watermark | HD tanpa watermark |
| Template | 3 dasar | Semua dasar | Semua + premium |
| Retake per sesi | 1× | 3× | 3× |
| Ekspor format | 1 | 2 (mis. Story + Feed) | 2 per sesi |
| Timeline/Series (V1) | ❌ | ❌ | ✅ |

**Aturan:**
- Pembayaran ditawarkan **setelah preview hasil** (momen "wow"), bukan sebelum foto.
- Yang membayar: **creator**. Partner otomatis mendapat akses HD untuk sesi itu.
- Kuota paket 3 sesi berlaku **90 hari**, terikat email/akun (bukan perangkat).

## 5.2 Definisi "Sesi"
1 sesi = 1 room yang menghasilkan 1 photostrip HD (4 foto), termasuk retake sesuai tier. Room baru = kuota baru.

## 5.3 Kebijakan Kegagalan & Refund

| Kasus | Kebijakan |
|---|---|
| Sesi gagal karena sistem | Kuota tidak terpotong / dikembalikan otomatis |
| Partner tidak pernah join | Kuota tidak terpakai |
| Bayar sukses, HD gagal dihasilkan | Kuota kembali + notifikasi + retry otomatis |
| Bayar ganda (duplikat) | Refund otomatis duplikat (idempotency + rekonsiliasi harian) |
| Ketidakpuasan kualitas | Refund manual ≤ 24 jam, per kasus |

---

# 6. SCOPE

## 6.1 MVP (P0)
Landing · create room (guest) · join via link + deteksi in-app browser · consent 2 pihak · device check · preview live pasangan · countdown tersinkronisasi + 4 capture · retake · 3 template · komposisi photostrip · download gratis (watermark) · pembayaran QRIS + deep link e-wallet · HD unlock · incremental persistence & session resume · auto-delete · admin dashboard dasar · event analytics inti.

## 6.2 V1
Akun ringan (Google/OTP) · Memory Gallery · Kalender Momen · Timeline/Series · template musiman · filter & sticker dasar · referral · voucher · Story/Feed export otomatis · public page (opt-in kedua pihak).

## 6.3 Out-of-Scope (sengaja tidak dibangun)
Native app · AI generation · feed sosial publik · livestream · chat · e-commerce · hardware booth · subscription kompleks · room > 2 orang · galeri publik · marketplace.

---

# 7. USER FLOW UTAMA

```text
LANDING
  │ [Buat Satu Frame]
  ▼
PILIH MOMEN → PILIH TEMPLATE
  ▼
ROOM DIBUAT → link + Share (WhatsApp / IG / Copy)
  ▼
PARTNER BUKA LINK
  ├─ In-app browser?  → banner "Buka di Chrome/Safari" + Copy Link
  ├─ Consent 2 pihak
  └─ Izin kamera
  ▼
DEVICE CHECK (kedua sisi: kamera, koneksi, orientasi)
  ▼
KEDUANYA "READY"
  ▼
┌─► POSE GUIDE #n → COUNTDOWN (3-2-1 + bip) → CAPTURE → UPLOAD INCREMENTAL
│     │
└─────┘ (ulang ×4)
  ▼
REVIEW & RETAKE
  ▼
COMPOSE (client canvas → fallback server)
  ▼
PREVIEW HASIL (gratis, watermark)   ◄── momen "wow"
  ├─ Download gratis
  └─ Buka HD (Rp15K / Rp35K) ── QRIS / Deep link e-wallet ── auto-resume ── HD
  ▼
SHARE
```

**Target:** landing → foto pertama < 2 menit (median).

---

# 8. ARSITEKTUR SISTEM

## 8.1 Prinsip Arsitektur (Dikunci)

> **Foto berkualitas tinggi diambil lokal. Jaringan hanya membawa sinyal, preview kecil, dan hasil capture yang di-upload incremental.**

```text
DEVICE A                                        DEVICE B
 Kamera full-res                                 Kamera full-res
   │                                                │
   ├──► Preview stream kecil (WebRTC P2P) ◄─────────┤   (visual saja, ≤ 480p)
   │                                                │
   └── Capture lokal @ T ───┐            ┌── Capture lokal @ T
                            ▼            ▼
                  Upload incremental (HTTPS, per jepretan)
                            │
                            ▼
                  Object Storage (temp, TTL)  +  DB (metadata)
                            │
                            ▼
              Compose: client canvas ► fallback server render
                            │
                            ▼
                        Hasil akhir
```

## 8.2 Komponen & Stack Rekomendasi

| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend | Next.js (React) + Tailwind | SEO landing, ekosistem |
| Realtime signaling & state | WebSocket (Supabase Realtime / Ably / Socket.io) | Sederhana, murah |
| TURN relay | **Cloudflare Calls** | Satu-satunya pilihan yang unit economicsnya tidak merusak margin di TURN usage 50-65% (khas Indonesia). Gratis di bawah 1.000 participant-minute/bulan, $0.05/1.000 participant-minute setelahnya. Twilio ($0.40/GB) dan coturn self-hosted tidak viable. |
| Backend & DB | Supabase (Postgres, Auth, Storage) atau Node.js + Postgres | Cepat untuk tim kecil |
| Object storage | Cloudflare R2 (TTL/lifecycle rule) | Egress murah |
| Payment | Midtrans / Xendit (QRIS, GoPay, ShopeePay, VA) | Standar Indonesia |
| Fallback render | Node.js + `sharp` (single container) | Lihat §10; menyederhanakan pipeline MVP |
| Analytics | PostHog / Plausible + event table internal | Funnel |

**Spesifikasi Teknis TURN:**
TURN relay dikonfigurasi dengan minimal dua server untuk redundansi (satu primary, satu fallback). ICE timeout dikonfigurasi 8 detik (bukan default 30 detik) untuk deteksi cepat. Bitrate cap stream preview: 400 kbps via `RTCRtpSender.setParameters()` (lihat §8.3).

## 8.3 Peran WebRTC vs WebSocket vs HTTPS

| Kanal | Fungsi | Toleransi drop |
|---|---|---|
| WebRTC (P2P) | Preview live pasangan (visual saja) | Boleh turun kualitas; **tidak kritis** untuk hasil |
| WebSocket | Signaling, presence, state sesi, sinkronisasi waktu, event capture | Kritis; auto-reconnect |
| HTTPS | Upload foto per jepretan, pembayaran, unduhan | Kritis; retry + resumable |

Prinsip: **kegagalan WebRTC tidak boleh menggagalkan sesi.** Jika preview pasangan gagal, sesi tetap berjalan dengan placeholder (avatar/nama) dan hasil tetap benar.

**Bitrate Cap Preview (Requirement Wajib):**
Preview stream dibatasi maksimum 400 kbps menggunakan `setParameters({ encodings: [{ maxBitrate: 400_000, maxFramerate: 24 }] })`. Ini adalah requirement, bukan optimasi. Tanpa cap ini, WebRTC adaptive bitrate bisa melonjak ke 1.5-3 Mbps dan biaya TURN bisa 7-10x lebih tinggi dari estimasi.

---

# 9. SINKRONISASI KAMERA & PENANGANAN SHUTTER LAG (AREA KRITIS 1)

## 9.1 Masalah

| Sumber ketidakpastian | Rentang tipikal |
|---|---|
| Selisih clock perangkat A vs B | ratusan ms – detik |
| Latensi jaringan (WebSocket one-way) | 20–400 ms, variabel |
| Shutter lag `takePhoto()` / grab frame (Android entry/mid) | 100–600 ms |
| Shutter lag iOS Safari (grab frame dari `<video>`) | 30–150 ms, lebih konsisten |
| Autofocus/auto-exposure hunting saat capture | 50–500 ms |
| Jitter timer JS (tab background, throttle) | 4–100+ ms |

Mengandalkan estimasi clock offset saja **tidak cukup**: ia tidak menangkap shutter lag hardware yang berbeda per perangkat.

## 9.2 Mekanisme Sinkronisasi Berlapis

```text
LAPIS 1  Clock offset (server time sync)          → baseline waktu bersama
LAPIS 2  Kalibrasi shutter lag per perangkat      → kompensasi hardware
LAPIS 3  Pre-roll frame buffer                    → hilangkan ketergantungan pada "detik tepat"
LAPIS 4  Pemilihan frame terbaik (post-capture)   → toleransi gerak
LAPIS 5  UX pose statis (countdown seragam)       → kecilkan dampak selisih residual
```

### Lapis 1: Clock offset (di luar hanya "NTP server")
- Estimasi offset dengan **ping-pong berulang** (min. 8 sampel) pada `t0` (client kirim) → `ts` (server timestamp) → `t1` (client terima).
- `RTT = t1 - t0`; `offset ≈ ts - (t0 + RTT/2)`.
- Ambil **median dari 5 sampel dengan RTT terendah** (buang outlier jaringan).
- Re-sync setiap 10 detik selama sesi; hentikan capture jika drift > 150 ms tanpa re-sync.
- Gunakan `performance.now()` (monotonic) sebagai basis, bukan `Date.now()`, untuk menghindari lompatan jam sistem.

### Lapis 2: Kalibrasi shutter lag per perangkat
Pada **device check**, lakukan **tes kalibrasi otomatis 5 kali** untuk mengukur `frame_grab_lag_ms`:
1. Klien memicu ekstraksi frame uji pada canvas ringan (320×240) dan mencatat `t_trigger` (`performance.now()`).
2. Saat frame selesai diekstrak, catat `t_ready`.
3. `shutter_lag_i = t_ready - t_trigger`.
4. Simpan **median dari 5 sampel** sebagai `frame_grab_lag_ms` (disimpan sebagai `device_lag_ms`).

Kompensasi: klien memicu capture **lebih awal sebesar `device_lag_ms`** dari waktu target:

```text
t_local_trigger = t_target_server - offset - device_lag_ms
```

**Catatan MVP:** Kalibrasi hanya mengukur `frame_grab_lag_ms`. Referensi ke `takephoto_lag_ms` dipindahkan ke V1 karena `ImageCapture.takePhoto()` dinonaktifkan di MVP scope untuk mengeliminasi race condition dua Promise paralel.

### Lapis 3: Pre-roll frame buffer (Resolusi Kerja 960px & 3-Tier Timestamp)
Alih-alih bergantung pada panggilan satu instan, klien **menyimpan ring buffer frame** selama jendela di sekitar `T`:

1. **Resolusi Kerja Buffer (Budget Memori Aman):**
   - Ring buffer **N = 12 frame** (≈ 400 ms @ 30 fps) disimpan pada resolusi kerja: **sisi panjang maksimum 960 px** (bukan resolusi capture penuh).
   - Kalkulasi memori: 12 frame × (960 × 720 × 4 bytes) ≈ 33 MB. Dengan overhead `ImageBitmap` totalnya ≈ 40-45 MB. Ini sepenuhnya aman untuk batas heap iOS Safari pada iPhone 8/SE (< 150 MB).

2. **Tiga Tier Timestamp Eksplisit:**
   - **Tier 1 (Chrome Android 83+, Safari 17+):** Gunakan `requestVideoFrameCallback` (rVFC), simpan `rvfc_last_timestamp` via metadata callback.
   - **Tier 2 (iOS 15-16, Safari tanpa rVFC):** Gunakan differential estimation dari `video.currentTime` terhadap baseline awal.
   - **Tier 3 (Fallback terakhir):** `performance.now()` saat `drawImage`, dengan catatan peringatan: *akurasi rendah, ΔT p95 bisa meleset +100 ms akibat variasi thread compositor iOS*.

```javascript
// Baseline differential timestamp (Tier 2 untuk iOS 15-16)
let t_ref = performance.now();
let ct_ref = video.currentTime;

function getFrameTimestamp(metadata) {
  if (metadata && typeof metadata.presentationTime === 'number') {
    return metadata.presentationTime; // Tier 1: rVFC
  }
  if (typeof video.currentTime === 'number' && video.currentTime > 0) {
    // Tier 2: differential estimation dari video element clock
    return t_ref + (video.currentTime - ct_ref) * 1000;
  }
  // Tier 3: wall clock fallback (peringatan: akurasi rendah, ΔT p95 bisa meleset +100ms)
  return performance.now();
}
```

3. **Pipeline Capture Dua Langkah (MVP):**
```javascript
// Langkah 1: grab kontinu ke buffer pada resolusi kerja 960px
const smallBitmap = await createImageBitmap(video, {
  resizeWidth: 960,
  resizeQuality: 'medium'
});
buffer.push({ bitmap: smallBitmap, t: getFrameTimestamp() });
if (buffer.length > 12) {
  const oldest = buffer.shift();
  oldest?.bitmap.close();
}

// Langkah 2: setelah frame terbaik terpilih, lakukan satu grab ulang di resolusi penuh
const selectedT = buffer.find(nearestToTarget).t;
const finalCanvas = document.createElement('canvas');
finalCanvas.width = 1920; 
finalCanvas.height = 1440;
const finalCtx = finalCanvas.getContext('2d');
finalCtx.drawImage(video, 0, 0, 1920, 1440);
// Ini adalah satu-satunya grab operation per shot di MVP (akurasi ±33ms dari frame terpilih)
```

**Penyederhanaan MVP:** `ImageCapture.takePhoto()` upgrade dihapus dari MVP scope dan dipindahkan ke §23 Roadmap V1. Di MVP, seluruh pengambilan foto menggunakan buffer kerja 960px dan single `drawImage` output 1920px.

### Lapis 4: Pemilihan frame terbaik (opsional MVP+, direkomendasikan)
Dalam buffer ±200 ms, skor tiap frame:
- **Ketajaman** (variansi Laplacian pada downsample 320px)
- **Tidak mata tertutup** (V1; butuh model wajah ringan, tunda jika berat)

Pilih frame dengan skor tertinggi dalam jendela ±150 ms dari `T`. MVP: cukup ketajaman (murah, tanpa model ML).

### Lapis 5: Countdown & UX pose statis (lihat §9.3)

## 9.3 Countdown Visual/Audio Seragam & Pose Statis

**Prinsip:** user harus **diam dan siap sebelum** waktu capture, sehingga selisih residual ±150-250 ms tidak terlihat.

### Jadwal per foto (contoh, total ±8 detik)

| Waktu (relatif T) | Kejadian |
|---|---|
| T - 5000 ms | Tampil **Pose Guide** ("POSE 02: Buat hati ❤️") |
| T - 3000 ms | Countdown **3** mulai (visual besar + bip pitch 1) |
| T - 2000 ms | **2** (bip pitch 1) |
| T - 1000 ms | **1** (bip pitch 1) |
| T - 0 | **CAPTURE** (bip pitch 2 lebih tinggi + flash layar putih 120 ms) |
| T + 600 ms | Freeze frame (tampilkan hasil sementara) |
| T + 1500 ms | Lanjut ke pose berikutnya atau review |

### Seragam antar perangkat
- **Waktu tampil angka ditentukan dari jadwal server, bukan timer lokal berantai.** Klien menghitung waktu lokal tiap tick dari `t_target_server` dan offset; drift tidak terakumulasi.
- Jalankan countdown dengan `requestAnimationFrame` + koreksi terhadap jadwal absolut, bukan `setInterval` berantai (menghindari akumulasi jitter).
- **Bip audio dijadwalkan dengan Web Audio API** (`AudioContext.currentTime`), bukan `<audio>.play()`, agar presisi. Bip menjadi sinyal utama sinkronisasi (audio lebih presisi daripada animasi).
- **Audio unlock**: `AudioContext` di-resume saat tap "Ready" (gesture pengguna), wajib untuk iOS.
- **Fallback tanpa audio**: jika perangkat *muted* atau audio gagal, tampilkan **pulsa visual** (cincin animasi + getar `navigator.vibrate` di Android) pada tiap tick.
- **Aksesibilitas:** visual tetap tampil jika audio mati.

### Pose statis
- Pose Guide selesai sebelum countdown; teks: *"Tahan pose sampai lampu putih"*.
- Indikator **"Tahan..."** muncul saat detik ke-1 → capture.
- Tambahkan **jendela hold 800 ms** setelah bip capture: teks "Tahan sebentar...", agar user tidak bergerak sebelum frame terpilih dari buffer.

## 9.4 Sinkronisasi Kesiapan (Ready Gate)

Countdown hanya dijadwalkan jika **kedua klien** melaporkan:
- `ready = true`
- `offset_synced = true` (drift < 150 ms)
- `device_lag_ms` terkalibrasi
- `tab_visible = true` (Page Visibility API)
- `ws_rtt_ms < 800`

Jika salah satu gagal → tampilkan pesan spesifik ("Koneksi pasanganmu lambat, tunggu sebentar"), **tidak memulai countdown.**

### Abort Mechanism saat COUNTDOWN
Setiap klien memantau `document.visibilityState` selama fase COUNTDOWN. Jika tab menjadi hidden sebelum capture terjadi, klien HARUS:
1. Membatalkan semua scheduled task (`clearTimeout`, `cancelAnimationFrame`).
2. Mengirim event `CAPTURE_ABORT` ke server via WebSocket: `{ type: 'CAPTURE_ABORT', shot_no, reason: 'tab_hidden', participant_id }`.
3. Server menerima `CAPTURE_ABORT` dan melakukan transisi state `COUNTDOWN -> READY` (bukan ke RECONNECTING).
4. Server menunggu kedua klien READY sebelum menjadwalkan countdown baru.

### Server-Side Ready Aggregation
Server menyimpan `participants_ready: Map<participant_id, ReadyPayload>` per sesi. Logika:
1. Validasi semua kondisi Ready Gate untuk partisipan P (offset, lag, tab_visible, ws_rtt).
2. Jika valid: `participants_ready.set(P.id, payload)`. Jika tidak valid: kirim event ERROR ke P dengan alasan spesifik.
3. Jika `participants_ready.size === session.max_participants` (= 2):
   - Cek guard condition: `session.state === 'READY'`. Jika bukan READY (misal sudah COUNTDOWN atau CAPTURING), abaikan untuk mencegah double trigger.
   - Lakukan transisi state atomik `READY -> COUNTDOWN`, lalu panggil `scheduleCountdown()` SEKALI.
4. Reset `participants_ready` jika sesi kembali ke state sebelum READY.

## 9.5 Penjadwalan Capture (Protokol)

```text
1. Creator/Server memilih t_target_server = now_server + 8000 ms (lead time)
2. Server broadcast: SCHEDULE_CAPTURE {shot_no, t_target_server, pose_id}
3. Tiap klien:
     t_local_target = t_target_server - offset
     jadwalkan visual/audio dari t_local_target
     jadwalkan trigger capture di t_local_target - device_lag_ms
4. Saat capture selesai, klien kirim ACK_CAPTURE {shot_no, t_frame_local, t_frame_server_est, lag_used}
5. Server menunggu ACK dari kedua klien (timeout = 4 detik dari t_target_server):
     - Jika kedua ACK tiba: hitung |ΔT| antara frame A dan B
     - Jika hanya 1 ACK tiba: tandai shot PARTIAL
     - Jika 0 ACK tiba: tandai shot MISSED, reschedule otomatis
6. Jika |ΔT| > toleransi keras (lihat 9.6) → tandai shot "desync", tawarkan retake otomatis (system retry, max 3x)
```

**Lead time 8 detik** memberi ruang untuk Pose Guide + countdown dan mengurangi dampak jitter jaringan pada saat pengumuman jadwal.

## 9.6 Target Toleransi (Realistis, Berdasarkan Kelas Perangkat)

| Kombinasi Perangkat | Target \|ΔT\| p50 | Target \|ΔT\| p95 | Batas Keras (Auto-Retake) |
|---|---|---|---|
| iOS 17+ (rVFC) × iOS 17+ | ≤ 80 ms | ≤ 200 ms | > 400 ms |
| iOS 15-16 (no rVFC) × iOS 15-16 | ≤ 150 ms | ≤ 350 ms | > 650 ms |
| iOS 15-16 × Android flagship | ≤ 180 ms | ≤ 380 ms | > 700 ms |
| Android mid-range × Android mid-range | ≤ 200 ms | ≤ 420 ms | > 750 ms |
| Terburuk (iOS 15-16 × Android entry) | ≤ 250 ms | ≤ 500 ms | > 900 ms |

**Keputusan produk:**
- Target marketing/PRD: **"perceptually simultaneous"**, yaitu **p95 < 350 ms lintas perangkat** untuk pose statis. Klaim "puluhan ms" **dihapus**.
- Foto pose statis: selisih hingga ±350 ms tidak terlihat sebagai ketidaksinkronan karena subjek diam.
- Jika ΔT melebihi **batas keras**, shot ditandai `DESYNC`, dan UI menawarkan **"Ulangi foto ini"** (system retry, maksimal 3x per shot) tanpa mengurangi kuota retake pengguna.

## 9.7 Deteksi & Adaptasi Perangkat Lemah
Saat device check, klasifikasikan perangkat (heuristik, bukan fingerprint sensitif):

| Sinyal | Aksi |
|---|---|
| `device_lag_ms > 400` | Aktifkan mode **"Stabil"**: countdown diperpanjang (T-4000), resolusi capture dibatasi 1080p |
| `deviceMemory ≤ 2` GB / fps < 20 | Turunkan resolusi buffer ke 640px, kurangi ring buffer ke 8 frame |
| Kamera auto-focus lambat | Kunci fokus/exposure sebelum countdown bila tersedia (`applyConstraints`: `focusMode`, `exposureMode` = `manual/locked`) |
| Perangkat sangat lemah (lag > 800 ms berulang) | Peringatan: "Perangkat mungkin lambat; hasil tetap bisa dibuat" (jangan blokir) |

## 9.8 Pengujian Wajib (Test Matrix Sinkronisasi)

| Kombinasi | iOS Versi | Jaringan | Kriteria Lulus |
|---|---|---|---|
| iPhone (Safari) ↔ iPhone | iOS 17+ ↔ iOS 17+ | WiFi / 4G | p95 ΔT < 200 ms |
| iPhone ↔ iPhone (Legacy) | iOS 15-16 ↔ iOS 15-16 | WiFi / 4G | p95 ΔT < 350 ms (Tier 2 differential) |
| iPhone ↔ Android mid | iOS 15-16 ↔ Android | 4G / 4G | p95 ΔT < 380 ms |
| Android entry ↔ Android entry | N/A | 4G / 3G | p95 ΔT < 500 ms, completion ≥ 85% |
| Desktop Chrome ↔ iPhone | iOS 15+ | WiFi / 4G | p95 ΔT < 250 ms |
| Jaringan buruk (throttle 3G, 300 ms RTT) | Variatif | sim. | Sesi tidak crash; countdown tidak mulai jika Ready Gate gagal |
| Tab background saat countdown | iOS 15+ / Android | 4G | Switch ke WhatsApp pada detik ke-2: countdown dibatalkan, state kembali ke READY, tidak ada foto terambil, kuota retake tidak berkurang |

---

# 10. RENDERING CANVAS & BATASAN MEMORI MOBILE (AREA KRITIS 2)

## 10.1 Masalah
iOS Safari membatasi total memori canvas dan dapat **menghentikan/reload tab** ("A problem repeatedly occurred"). Batas praktis:
- Ukuran canvas maksimum ±16.7 megapiksel (area) pada iOS; total memori canvas terbatas (per tab, akumulatif, ±384 MB pada perangkat lama, bukan jaminan).
- Setiap canvas 4-byte/piksel: 4000×6000 = 96 MB per canvas, **berbahaya bila ada beberapa canvas/salinan**.
- Android entry (RAM 2–3 GB) juga rentan OOM saat memegang 8 foto full-res (4 lokal + 4 dari partner).

## 10.2 Strategi Resolusi

### Resolusi capture vs output
- **Capture** dibatasi: sisi panjang **maks 1920 px** (≈ 2 MP) di perangkat *low-memory*, **maks 2560 px** di perangkat normal. Tidak perlu 12 MP; output akhir hanya 1080–2160 px lebar.
- Foto **diturunkan (downscale) segera** setelah capture ke ukuran kerja, resolusi asli tidak dipegang di memori.

#### Ukuran output photostrip (4 frame, layout vertikal)

| Profil | Kanvas final (W×H) | Piksel | Perkiraan memori RGBA |
|---|---|---|---|
| **Ring buffer** | 12 frame @ 960px per sisi | - | ±33-45 MB (aman < 150 MB heap) |
| **Preview (in-app)** | 540 × 1620 | 0,87 MP | ±3,5 MB |
| **Standard (default HD)** | 1080 × 3240 | 3,5 MP | ±14 MB |
| **Story** | 1080 × 1920 | 2,07 MP | ±8,3 MB |
| **Feed** | 1080 × 1350 | 1,46 MP | ±5,8 MB |
| **High (opsional, perangkat kuat)** | 1440 × 4320 | 6,2 MP | ±25 MB |
| **Batas keras klien** | ≤ **8 MP** total | | ±32 MB |

**Aturan:** kanvas final **tidak boleh melebihi 8 MP** di klien mobile. Cetak 4R (mis. 1200×1800 per strip) dirender **server-side** jika diminta.

### Aturan memori
1. **Satu kanvas final dalam satu waktu.** Jangan membuat kanvas tambahan untuk preview + final bersamaan; gunakan **satu kanvas dan turunkan skalanya** untuk tampilan (CSS scaling).
2. **Gunakan `ImageBitmap`** dan `createImageBitmap(blob, {resizeWidth, resizeQuality})`, **bukan `<img>` + decode penuh**, agar decode di luar main thread dan bisa dibuang cepat.
3. **Gambar satu foto per waktu**: decode → `drawImage` → `bitmap.close()` → foto berikut. Jangan menahan 8 bitmap sekaligus.
4. **Konversi ke Blob** dengan `canvas.toBlob(cb, 'image/jpeg', 0.9)` (bukan `toDataURL` yang menggandakan memori sebagai string base64).
5. **Bebaskan kanvas segera**: setelah `toBlob`, set `canvas.width = canvas.height = 0` (trik iOS agar memori dilepas), lalu buang referensi.
6. **Hindari filter CSS/`ctx.filter` besar** pada kanvas final di iOS; terapkan filter pada ukuran kerja atau server.
7. **Deteksi OffscreenCanvas & convertToBlob:** Gunakan `OffscreenCanvas` + Web Worker bila didukung stabil (Chrome/Android 87+, Safari 17.2+).
   
   Sebelum menggunakan OffscreenCanvas, lakukan feature detection terhadap `convertToBlob()` (bukan `toBlob()`, karena `toBlob` tidak ada di interface `OffscreenCanvas`):
   ```javascript
   async function detectOffscreenBlobSupport() {
     if (typeof OffscreenCanvas === 'undefined') return false;
     try {
       const oc = new OffscreenCanvas(1, 1);
       if (typeof oc.convertToBlob !== 'function') return false;
       const blob = await oc.convertToBlob({ type: 'image/jpeg' });
       return blob instanceof Blob;
     } catch {
       return false;
     }
   }
   ```

   | Platform | OffscreenCanvas | convertToBlob | Rekomendasi |
   |---|---|---|---|
   | Chrome Android 87+ | Ya | Ya | Gunakan Web Worker |
   | Firefox 105+ | Ya | Ya | Gunakan Web Worker |
   | Safari 17.0+ | Ya | Ya (buggy di 17.0-17.1) | Gunakan Web Worker di 17.2+ |
   | Safari 15-16 | Tidak | Tidak | Render di Main Thread |
   | iOS Safari < 17 | Tidak | Tidak | Render di Main Thread |

8. **Batasi teks/emoji berat** pada kanvas final (render teks sekali; hindari ratusan `fillText`).

## 10.3 Pipeline Rendering Klien

```text
[Foto A_i, B_i (blob, sudah ≤ 1920px)]
       │
       ▼
  Loop i = 1..4:
     bitmapA = createImageBitmap(A_i, resize ke slot)
     draw ke kanvas final
     bitmapA.close()
     bitmapB = ... (idem)
       │
       ▼
  Gambar frame/template (aset ter-cache sebagai ImageBitmap kecil)
       │
       ▼
  toBlob(JPEG 0.9)  →  release canvas (w=h=0)
       │
       ▼
  Blob hasil (≈ 400–900 KB)  →  simpan ke storage sementara
```

## 10.4 Deteksi Risiko & Guardrail
- Sebelum render, hitung `estimated_mb = W×H×4 / 1_048_576 × 1.5` (faktor overhead); jika > **threshold perangkat** (mis. 48 MB low-memory, 96 MB normal) → turunkan profil otomatis.
- Gunakan `navigator.deviceMemory` (jika tersedia) dan UA heuristik iOS (iPhone ≤ 6 GB RAM) untuk memilih profil awal.
- **Tangkap kegagalan render:** cek hasil `toBlob` bernilai `null`, `RangeError`, atau kanvas kosong (uji pixel sampling di 4 titik). Jika gagal → **fallback otomatis** (§10.5).
- **Deteksi Crash-Loop Tahan iOS bfcache (IndexedDB):**
  Hapus ketergantungan pada `sessionStorage` untuk crash-loop. Gunakan IndexedDB store `render_state` dengan skema: `{ session_id, render_crash_count: number, last_render_started_at: timestamp, last_render_completed_at: timestamp | null }`.
  - Sebelum render dimulai: increment `render_crash_count`, set `last_render_started_at = now()`.
  - Setelah render sukses (menghasilkan blob valid): set `last_render_completed_at = now()`, reset `render_crash_count = 0`.
  - Kriteria crash-loop: `render_crash_count >= 2` DAN `last_render_completed_at === null`.
  - **Penanganan iOS bfcache:** Jangan anggap kembali dari aplikasi e-wallet sebagai crash:
  ```javascript
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      // bfcache restore: BUKAN crash
      // Jangan increment render_crash_count
      checkPaymentStatus();
      reconnectWebSocket();
      return;
    }
    // Fresh load: periksa render_crash_count dari IndexedDB
    checkRenderCrashLoop();
  });
  ```

## 10.5 Fallback Server-Side Rendering

**Pemicu fallback:**
1. `toBlob` gagal/`null`/exception.
2. Kanvas kosong (pixel check gagal).
3. Terdeteksi reload saat render sebelumnya (crash-loop via IndexedDB).
4. Perangkat diklasifikasikan *very-low-memory*.
5. Ekspor cetak 4R / resolusi > 8 MP diminta.
6. Waktu render klien > 12 detik (timeout).

**Arsitektur fallback:**

```text
Klien ──(POST /render, photos sudah di storage via upload incremental)──► Node.js + sharp (container)
                                                                         │
                                                                         ▼
                                                          Hasil di R2 (signed URL, TTL)
```

**Detail:**
- Karena foto **sudah di-upload incremental** (§11), fallback **tidak butuh upload ulang**: server membaca dari storage.
- Input job: `{session_id, template_id, profile, photo_keys[8], text_fields, watermark:bool}`.
- **Job idempoten**: `render_job_id = hash(session_id, template_version, profile, photo_versions)`; request ulang mengembalikan hasil yang sama (cache).
- Watermark & tier (gratis/HD) **diterapkan di server untuk ekspor resmi** (mencegah bypass klien).
- Target: **p95 < 6 detik** hasil siap (Worker/sharp), timeout 20 detik → retry sekali → gagal terkontrol.
- **Konkurensi & biaya:** batasi antrean (max 20 job bersamaan MVP); rate limit per sesi (mis. 5 render/jam).
- **Pilihan implementasi:**
  - **MVP:** Node.js + `sharp` di container kecil (mis. Fly.io/Railway/Cloud Run), paling andal untuk layout kompleks.
  - **Optimasi:** Cloudflare Worker + WASM (mis. `photon`/`resvg`) untuk layout sederhana agar murah.
- **Sanity check hasil:** server memvalidasi dimensi & ukuran file (> 50 KB, < 5 MB) sebelum menandai `render_status = OK`.

## 10.6 Aset Template
- Template disimpan sebagai **PNG/WebP transparan berukuran tepat** (tidak lebih besar dari profil output).
- Sediakan **varian resolusi** (`@1x` untuk preview, `@2x` untuk standard); jangan memakai satu aset 4K untuk semua.
- Font di-embed subset (Latin + emoji dasar); hindari font web besar (> 150 KB).

## 10.7 Pengujian Wajib (Rendering)
| Perangkat | Uji | Lulus jika |
|---|---|---|
| iPhone SE/8 (RAM 2–3 GB) | Render Standard 1080×3240, 5× berturut-turut | Tanpa reload/crash |
| iPhone 12–15 | Render High 1440×4320 | Tanpa crash |
| Android entry (RAM 2 GB) | Render Standard 1080×3240 | Tanpa OOM atau fallback mulus |
| Semua | Paksa gagal kanvas | Fallback server sukses ≥ 99% |
| Semua | Reload di tengah render | Tidak crash-loop; fallback aktif |

---

# 11. STATE MACHINE & PEMULIHAN SESI (AREA KRITIS 3)

## 11.1 Prinsip: Kepemilikan State Otoritatif

> **Server adalah sumber kebenaran (source of truth) untuk state sesi. Klien adalah replika + penyedia data capture lokal.**

| Data | Pemilik otoritatif | Keterangan |
|---|---|---|
| Status sesi (`CAPTURING`, dst.) | **Server** | Klien tidak boleh mengubah langsung; hanya mengirim intent |
| Nomor shot aktif & jadwal (`t_target_server`) | **Server** | Menghindari split-brain |
| Daftar peserta & presence | **Server** | Berdasarkan heartbeat WebSocket |
| Foto mentah (hasil capture) | **Klien menghasilkan, server menyimpan** | Setelah ACK upload, server otoritatif |
| Preview stream WebRTC | Klien (ephemeral) | Tidak disimpan, tidak otoritatif |
| Template & teks pilihan | Server | Versi template dikunci (`template_version`) |
| Status pembayaran | **Server (via webhook gateway)** | Klien **tidak pernah** dipercaya |
| Kuota/entitlement | Server | |

**Mekanisme konsistensi:**
- Setiap perubahan state menaikkan `state_version` (integer monoton).
- **Mutasi Atomik (P1-C2):** `state_version` HARUS di-increment dalam satu database transaction yang sama dengan perubahan `sessions.state`. Tidak boleh ada dua query terpisah atau caching `state_version` di memory aplikasi.
  ```sql
  BEGIN;
  UPDATE sessions 
  SET state = 'CAPTURING', 
      state_version = state_version + 1,
      updated_at = NOW()
  WHERE id = $1 AND state_version = $2; -- optimistic lock
  -- periksa affected rows; jika 0, state telah diubah oleh proses lain (reject 409)
  COMMIT;
  ```
- Klien mengirim `client_state_version` bersama intent; server menolak intent stale (`409 STALE_STATE`) dan mengirim snapshot terbaru.
- Server mem-broadcast setiap transisi; klien yang terlambat/reconnect meminta **snapshot penuh** (`GET /sessions/:id/state`).
- **Event bersifat idempoten**: setiap event punya `event_id` (UUID); server dan klien mengabaikan duplikat.

## 11.2 State Machine Sesi

```text
                    ┌────────────────────────────────────────────┐
                    │                                            │
CREATED ─► WAITING ─► CONNECTED ─► READY ─► COUNTDOWN ─► CAPTURING ─► SHOT_SAVED ─┐
                         ▲           ▲          │            │            │        │
                         │           │          │            │            │        │ (shot < 4)
                         │           │          │            │            │        └──► READY (shot berikut)
                         │           │          │            │            │
                         │           │          ▼            ▼            ▼
                         │           └──── (Ready Gate gagal / CAPTURE_ABORT → kembali READY)
                         │
                         │  (disconnect di state manapun aktif)
                         │
                   ┌─────┴──────┐
                   │ RECONNECTING│ ──(timeout 90s)──► PAUSED ──(timeout 30 mnt)──► ABANDONED
                   └─────┬──────┘                        │
                         │ (peer kembali)                │ (resume manual)
                         └───────► kembali ke state sebelumnya (dipulihkan dari snapshot)

(shot = 4 selesai) ─► REVIEW ─► COMPOSING ─► RESULT_READY ─► COMPLETED
                                     │
                                     └─ (gagal) ─► COMPOSE_FALLBACK ─► RESULT_READY

Terminal: COMPLETED · EXPIRED · CANCELLED · FAILED · ABANDONED
```

### Definisi state

| State | Deskripsi | Timeout / TTL |
|---|---|---|
| `CREATED` | Room dibuat, belum ada link dibagikan | 30 mnt → `EXPIRED` |
| `WAITING` | Menunggu partner | 30 mnt → `EXPIRED` |
| `CONNECTED` | Dua peserta hadir, consent + device check berlangsung | 10 mnt tanpa progres → `PAUSED` |
| `READY` | Kedua peserta `ready`, Ready Gate lulus | Menunggu jadwal countdown |
| `COUNTDOWN` | Jadwal capture terkirim, hitung mundur berjalan (abort ke READY jika tab hidden) | ≤ 12 dtk |
| `CAPTURING` | Trigger capture aktif (jendela ±800 ms) | ≤ 3 dtk |
| `SHOT_SAVED` | Foto ke-n tersimpan (kedua sisi ter-upload & ter-ACK) | Menunggu upload ≤ 20 dtk |
| `RECONNECTING` | Satu/dua peserta terputus | 90 dtk |
| `PAUSED` | Sesi ditangguhkan, data aman, dapat di-resume | 30 mnt → `ABANDONED` |
| `REVIEW` | Pilih/ulang foto | 15 mnt |
| `COMPOSING` | Render photostrip (aktif mengirim `COMPOSITING_ALIVE` tiap 2 dtk) | ≤ 20 dtk |
| `COMPOSE_FALLBACK` | Render server-side | ≤ 30 dtk |
| `RESULT_READY` | Hasil siap, tampil preview | - |
| `COMPLETED` | Hasil diunduh/dibagikan atau sesi ditutup | Data TTL berjalan |
| `EXPIRED` / `CANCELLED` / `FAILED` / `ABANDONED` | Terminal | |

**Keepalive Polling Selama COMPOSING (P1-B3):**
Selama state `COMPOSING`, klien mengirim event `COMPOSITING_ALIVE` setiap 2 detik ke server. Server yang menerima event ini me-reset timer heartbeat WebSocket klien tanpa memodifikasi state sesi. Server menaikkan batas grace period heartbeat dari 10 detik menjadi 20 detik untuk sesi yang aktif merender kanvas.

## 11.3 Skenario Disconnect di Tengah Pemotretan

### Kasus utama: Peserta B terputus saat foto ke-2 dari 4

```text
Kondisi awal: shot 1 SAVED (A1, B1 ter-upload). Sedang shot 2.

Sub-kasus 1: Disconnect SEBELUM countdown mulai (state READY/COUNTDOWN awal)
  → server batalkan jadwal; state → RECONNECTING
  → foto shot 1 tetap aman
  → B kembali dalam 90 dtk: snapshot dikirim → kembali READY (shot 2 diulang dari Pose Guide)

Sub-kasus 2: Disconnect SAAT COUNTDOWN (< T)
  → server tandai shot 2 = ABORTED (belum ada foto)
  → RECONNECTING; jika B kembali → READY shot 2 dari awal
  → tidak ada foto hilang

Sub-kasus 3: Disconnect TEPAT SAAT/SESUDAH CAPTURE (sebelum upload ACK)
  → A sudah upload A2; B punya B2 di memori/IndexedDB lokal
  → server: shot 2 = PARTIAL (hanya A2 ter-ACK)
  → jika B kembali & B2 masih di IndexedDB → upload otomatis, shot 2 = SAVED
  → jika B2 hilang → shot 2 dijadwalkan ulang, tanpa mengurangi retake

Sub-kasus 4: Disconnect > 90 dtk
  → state → PAUSED; kedua pihak melihat: "Sesi ditangguhkan. Lanjutkan kapan saja dalam 30 menit"
  → link room tetap valid; foto shot 1..k tetap tersimpan

Sub-kasus 5: Creator (bukan partner) yang terputus
  → sama seperti di atas; server tetap otoritatif; siapa pun yang kembali dapat melihat snapshot;
    hanya creator yang boleh memicu "Mulai shot berikutnya" (atau otomatis setelah kedua Ready)

Sub-kasus 6: Kedua peserta terputus bersamaan
  → server menahan state di PAUSED; resume oleh siapa pun yang kembali lebih dulu (menunggu yang lain)
```

### Aturan resume
- **Tidak mengulang dari awal.** Sesi dilanjutkan dari `shot_no = jumlah shot berstatus SAVED + 1`.
- Shot berstatus `PARTIAL` diprioritaskan **diselesaikan lewat upload ulang dari IndexedDB**; jika tidak tersedia, shot itu diulang.
- Pose Guide untuk shot yang diulang **sama** dengan sebelumnya (tidak mengacak).
- **Retake tidak berkurang** akibat disconnect/desync sistem.

## 11.4 Reconnect & Heartbeat

| Parameter | Nilai |
|---|---|
| Heartbeat WebSocket | ping tiap 5 dtk; anggap putus jika 2 ping (10 dtk) tak berbalas |
| Reconnect klien | exponential backoff 0.5s → 1s → 2s → 4s (maks 5 dtk), jitter ±20% |
| Grace period `RECONNECTING` | 90 dtk |
| Window resume `PAUSED` | 30 menit |
| Identitas peserta | `participant_token` (JWT pendek, masa berlaku `session.expires_at + 7 hari`, disimpan di cookie httpOnly / localStorage) |
| Re-join | Token yang sama otomatis menempati slot lama (tanpa consent ulang) |

## 11.5 Incremental Persistence (Simpan Per Jepretan)

### Prinsip
> **Setiap jepretan disimpan segera setelah diambil, baik di klien maupun di server, sehingga refresh tab/crash tidak menghilangkan foto yang sudah ada.**

### Dua lapis penyimpanan

```text
LAPIS KLIEN (cadangan lokal, sementara)
  IndexedDB:  store "shots"  { session_id, shot_no, participant_id, blob, sha256, status, created_at }
  → Diisi SEBELUM upload (write-ahead).
  → Wajib menunggu transaction.oncomplete sebelum memulai request upload.
  → Dihapus setelah server ACK final + 5 menit (masa aman) atau saat sesi COMPLETED.

LAPIS SERVER (otoritatif)
  Object storage:  sessions/{session_id}/shots/{shot_no}_{participant}.jpg   (TTL)
  DB:  session_photos  { id, session_id, participant_id, shot_no, storage_key, sha256, bytes, width, height, status }
```

### Alur per jepretan (Write-Ahead Durabel)

```text
1. Capture selesai → blob JPEG (≤ ~1.5 MB, sudah downscale)
2. Tulis ke IndexedDB dan TUNGGU transaction.oncomplete        ← P0-C1 Write-Ahead Durabel
3. Minta presigned upload URL:  POST /api/v1/sessions/:id/shots/:n/upload-url
4. PUT blob ke storage (retry exp. backoff, resumable jika > 1 MB)
5. POST /api/v1/sessions/:id/shots/:n/commit { sha256, bytes, width, height, participant_id, event_id }
6. Server verifikasi (ukuran, checksum, magic bytes JPEG, dimensi)
7. Server set status = SAVED, naikkan state_version atomik, broadcast SHOT_SAVED
8. Klien tandai IndexedDB status = SYNCED
```

**Kontrak Transaksi IndexedDB (P0-C1):**
Tulis ke IndexedDB menggunakan `IDBTransaction`. Tunggu konfirmasi `transaction.oncomplete` (BUKAN `request.onsuccess`) sebelum melanjutkan ke Langkah 3. Event `onsuccess` hanya mengonfirmasi write masuk ke buffer in-memory peramban, belum ter-flush ke storage fisik disk. Crash di antara keduanya berpotensi menyebabkan data hilang.

```javascript
async function writeToIndexedDB(shotData) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('shots', 'readwrite');
    const store = tx.objectStore('shots');
    store.put(shotData);
    tx.oncomplete = () => resolve(); // wajib tunggu oncomplete
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('IDB transaction aborted'));
  });
}

// Eksekusi: baru minta upload URL setelah transaksi lokal selesai di disk
await writeToIndexedDB(shotData);
await requestPresignedUrl(...);
```

### Penanganan Safari Private Mode / Kuota Penuh
Jika `indexedDB.open` gagal atau melempar `QuotaExceededError` (khas Safari Private Browsing dengan kuota 0-byte):
1. Aktifkan **in-memory Map** sebagai fallback penyimpanan lokal.
2. Unggah file **SEGERA** tanpa menunggu antrean atau jeda pose guide shot berikutnya.
3. Tampilkan banner persisten di UI: *"Mode privat terdeteksi. Jangan minimize atau tutup aplikasi hingga seluruh sesi selesai."*

### Retensi & Penguncian TTL Foto Terhadap Order (P1-C4)
TTL pembersihan foto mentah TIDAK boleh menghapus file jika sesi memiliki transaksi pembayaran yang berstatus `PENDING` atau memiliki order dengan `photos_hold_until > NOW()`.

**Formula TTL Efektif:**
```text
effective_ttl = MAX(
  created_at + INTERVAL '24 hours',
  COALESCE(MAX(orders.expires_at) + INTERVAL '48 hours', '-infinity')
)
```

- Saat order dibuat (`PENDING`): server menetapkan `orders.photos_hold_until = orders.expires_at + 48 hours`.
- Saat order `PAID`: server merender photostrip HD, setelah itu foto mentah dilepas dari penguncian.
- Saat order `EXPIRED` / `CANCELLED`: `photos_hold_until` dinonaktifkan.

| Data | TTL Efektif |
|---|---|
| Foto mentah sesi tidak selesai (`ABANDONED`) | 24 jam |
| Foto mentah sesi `COMPLETED` guest | `effective_ttl` (24 jam atau hingga order buffer habis) |
| Hasil photostrip guest | 7 hari (link unduh kedaluwarsa) |
| Data akun / Linimasa Memori (V1) | Sampai pengguna menghapus |
| IndexedDB lokal | Hapus otomatis saat COMPLETED / 24 jam |

## 11.6 Konflik & Edge Case State

| Edge case | Penanganan |
|---|---|
| Dua tab dari peserta yang sama | Tab terbaru mengambil alih; tab lama ditampilkan "Sesi dibuka di tab lain" |
| Intent ganda (dua "Ready" beruntun) | Idempoten via `event_id` |
| Peserta ketiga membuka link | Ditolak: "Room ini sudah penuh" (max_participants = 2) |
| Creator menutup sesi saat partner masih aktif | Konfirmasi dua pihak; server → `CANCELLED` |
| Jam perangkat salah drastis | Dikoreksi oleh offset; jika offset > 5 menit, tampilkan saran memperbaiki waktu |
| Server restart saat sesi berjalan | State dan `state_version` tersimpan atomik di DB; klien reconnect → kirim snapshot |
| Upload gagal permanen (3 retry) | Shot ditandai `UPLOAD_FAILED`; tawarkan retake shot itu |
| IndexedDB gagal (Private Mode / kuota penuh) | Aktifkan in-memory fallback + upload segera + tampilkan banner peringatan |

---

# 12. PEMBAYARAN QRIS & DEEP LINK E-WALLET (AREA KRITIS 4)

## 12.1 Masalah
Pindah ke aplikasi bank/e-wallet membuat browser mobile:
- **Membekukan (freeze/suspend) tab** → WebSocket putus, timer berhenti.
- Di iOS, tab dapat **dibuang dari memori** (state hilang, halaman reload saat kembali).
- Di Android, tab background dapat di-*discard* oleh Chrome.
- In-app browser (WhatsApp/IG) sering **tidak dapat membuka deep link** atau tidak kembali otomatis.
- Pengguna sering **tidak pernah kembali** ke tab yang benar.

## 12.2 Prinsip
1. **Pembayaran tidak bergantung pada tab tetap hidup.** Status pembayaran dipastikan server-side via webhook; klien hanya *menampilkan*.
2. **Pembayaran tidak mengganggu sesi.** Pembayaran terjadi **setelah** foto selesai dan tersimpan, sehingga kehilangan tab tidak menghilangkan foto (lihat §11.5).
3. **Kembali ke hasil kapan pun** lewat link permanen (`/r/:result_token`) sehingga pengguna dapat membuka ulang dari browser mana pun.

## 12.3 Metode Pembayaran (Prioritas)

| Prioritas | Metode | Mekanisme | Catatan |
|---|---|---|---|
| 1 | **GoPay (deep link)** | `gopay://` / URL universal dari gateway (`actions[deeplink-redirect]`) | Mobile, konversi tertinggi |
| 2 | **ShopeePay (deep link)** | Deeplink dari gateway | Mobile |
| 3 | **QRIS dinamis (gambar)** | QR string/gambar dari gateway, per transaksi | Fallback universal; unduh/tangkap layar |
| 4 | DANA / OVO / LinkAja | Sesuai dukungan gateway (bila tersedia) | Opsional |
| 5 | Virtual Account | Bank transfer | Latensi tinggi; hanya bila diminta |

- **QRIS dinamis** (nominal & referensi unik per order), **bukan QRIS statis** (sulit direkonsiliasi, rentan salah nominal/duplikat).
- Rekomendasi gateway: Midtrans (Core API/Snap) atau Xendit; pilih yang menyediakan **deeplink e-wallet**, **QRIS dinamis**, **webhook bertanda tangan**, dan **status check API**.

## 12.4 Alur Pembayaran

```text
Hasil preview (watermark) ─► [Buka HD] ─► Pilih paket (1 / 3 sesi)
   │
   ▼
POST /orders  { package_id, session_id, idempotency_key, client_return_url }
   │  server: buat order PENDING, panggil gateway, simpan gateway_ref, expires_at
   ▼
Tampilkan opsi bayar:
   ├─ [Bayar dengan GoPay]     → redirect ke deep link
   ├─ [Bayar dengan ShopeePay] → redirect ke deep link
   └─ [QRIS]                   → tampil QR + timer + tombol "Simpan QR"
   │
   ▼
Klien masuk mode "MENUNGGU PEMBAYARAN":
   • simpan order_id + result_token di localStorage & URL
   • polling status (lihat 12.6) + WS bila hidup
   ▼
Gateway → WEBHOOK ke server  (sumber kebenaran)
   ▼
Server verifikasi signature, cocokkan nominal & order, set PAID (atomik + idempoten)
   ▼
Server: buat entitlement, picu render HD (server-side jika perlu), broadcast PAYMENT_PAID
   ▼
Klien (sedang/ketika kembali) menerima status PAID → tampilkan "Pembayaran berhasil ✅" → HD siap
```

## 12.5 Deep Link E-Wallet (Spesifikasi)

- Server meminta gateway membuat charge dengan tipe e-wallet, mengambil `deeplink_url` (prioritas Universal Links / App Links mis. `https://gopay.co.id/...` atau `https://w.shopeepay.co.id/...`, fallback custom URL scheme `gopay://` / `shopeepay://`).
- Sertakan **`callback_url`/`finish_redirect_url`** = `https://satuframe.id/pay/return?order=:id&t=:result_token` sehingga e-wallet mengembalikan pengguna ke browser.
- **Deteksi perangkat:**
  - Android/iOS mobile: tampilkan tombol deep link **di atas**.
  - Desktop: tampilkan **QRIS** (scan dari ponsel) dan opsi deep link via QR.
- **Deep link timeout & penanganan (PROMPT D1):**
  - Gunakan threshold timeout **3.500 ms** (bukan 2 detik).
  - *Rasional teknis:* Pada perangkat Android entry/mid level dengan RAM terbatas dan kondisi jaringan seluler 3G/4G di Indonesia, peluncuran activity intent aplikasi eksternal sering memakan waktu hingga 3 detik. Batas 2 detik terlalu agresif dan memicu false-positive ("Aplikasi tidak terpasang") ketika pengguna sebenarnya sedang menunggu aplikasi e-wallet terbuka.
  - Jika setelah 3.500 ms `document.hidden` bernilai `false` (tab tidak berpindah ke background): tampilkan status "Aplikasi e-wallet tidak terbuka" beserta tombol alternatif instan.
- **Kontrol Pengguna Persisten (PROMPT D1):**
  - Tombol **"Gunakan QRIS"** dan **"Ganti metode pembayaran"** HARUS tetap tampak (*visible*) dan dapat diakses pengguna kapan saja tanpa harus menunggu timer 3.500 ms selesai.
- **In-app browser:** deep link sering diblokir oleh WebView bawaan. Tampilkan banner "Buka di browser" **sebelum** halaman pembayaran; sediakan tombol **Salin link pembayaran**.
- **QRIS di Ponsel yang Sama (Same-Device Payment UX - PROMPT D2):**
  - Pengguna tidak dapat memindai layar ponsel mereka sendiri dengan kamera belakang.
  - Hilangkan ketergantungan pada instruksi generik "tekan lama gambar/long-press".
  - Implementasikan render client-side canvas QRIS beresolusi tinggi dengan integrasi **Web Share API** (`navigator.share({ title: 'QRIS Pembayaran Satu Frame', files: [qrPngFile] })`) untuk memudahkan transfer ke aplikasi e-wallet atau galeri.
  - Sediakan tombol fallback unduh Blob PNG langsung (`download="qris-satuframe.png"`).
  - Sertakan panduan visual 4 langkah ringkas:
    1. Klik tombol **"Simpan QR ke Galeri"** atau **"Bagikan QR"**.
    2. Buka aplikasi e-wallet atau mobile banking kamu (BCA, GoPay, ShopeePay, DANA, OVO).
    3. Pilih menu **Bayar / QRIS**.
    4. Ketuk ikon **Galeri Foto** dan pilih gambar QRIS yang baru saja disimpan.

## 12.6 Penanganan Tab Beku, WebSocket Putus, & Auto-Resume

### Strategi berlapis (defense in depth)

```text
LAPIS 1  Webhook (server) ........ sumber kebenaran; tak bergantung klien
LAPIS 2  Return URL .............. e-wallet mengembalikan user ke /pay/return -> verifikasi instan
LAPIS 3  visibilitychange/pageshow  saat tab kembali -> cek status seketika
LAPIS 4  Polling adaptif .......... cadangan bila WS/event terlewat
LAPIS 5  Result token permanen .... user bisa kembali kapan saja dari link/riwayat WA
LAPIS 6  Notifikasi (opsional) .... email/WhatsApp link hasil setelah PAID
```

### Lapis 2: Return URL
- `/pay/return` adalah halaman ringan yang:
  1. Membaca `order` & `t` dari query.
  2. Memanggil `GET /api/v1/orders/:id/status?t=...` (server juga *pull-check* ke gateway jika webhook belum tiba > 3 dtk).
  3. Jika `PAID` -> redirect ke `/r/:result_token` (HD siap).
  4. Jika `PENDING` -> tampilkan "Memverifikasi pembayaran..." dengan polling.
- Halaman ini **tidak bergantung pada state sesi lama**; cukup token.

### Lapis 3: Event browser saat kembali
```javascript
window.addEventListener('visibilitychange', () => { if (!document.hidden) checkPaymentNow(); });
window.addEventListener('pageshow', (e) => { checkPaymentNow(); });      // termasuk bfcache restore
window.addEventListener('focus', checkPaymentNow);
window.addEventListener('online', checkPaymentNow);
```
- `checkPaymentNow()` memanggil status endpoint **segera** tanpa menunggu tick polling.

### Lapis 4: Polling adaptif

| Kondisi | Interval |
|---|---|
| 0-30 dtk setelah redirect | 2 dtk |
| 30-120 dtk | 4 dtk |
| 2-15 menit | 8 dtk |
| > 15 menit / tab hidden | Berhenti (bergantung Lapis 1-3, 5) |
- Jika WS tersedia, gunakan event `PAYMENT_PAID` sebagai jalur cepat, polling tetap sebagai cadangan.
- **Backoff & batas:** maks 120 permintaan per order; hentikan saat status terminal (`PAID`/`EXPIRED`/`FAILED`).

### Lapis 5: Result token permanen
- Setiap sesi hasil punya `result_token` (>= 128-bit acak) -> `https://satuframe.id/r/:result_token`.
- Token disimpan di `localStorage`, ditampilkan di URL, dan dapat **dikirim ke WhatsApp/email** ("Simpan link hasilmu").
- Membuka link kapan pun (dalam masa TTL) menampilkan hasil + status pembayaran.
- Tanpa akun pun, pengguna dapat kembali dengan link ini (anti-kehilangan tab).

### Tab di-discard / halaman reload
- Saat halaman reload, klien membaca `order_id`/`result_token` dari URL/`localStorage`, memanggil endpoint status, lalu **langsung melompat ke state yang benar** (menunggu / berhasil / kedaluwarsa).
- **Tidak boleh** bergantung pada memori JS untuk melanjutkan alur pembayaran.

### WebSocket putus saat di app bank
- WS dianggap **best-effort**; putusnya WS **tidak** mengubah status order.
- Saat kembali, klien reconnect WS dan memakai snapshot + status pembayaran (idempoten).
- Sesi foto sudah `RESULT_READY` (foto aman di server), sehingga tidak ada risiko kehilangan data.

## 12.7 Status Order & Idempotensi

```text
PENDING -> PAID -> (FULFILLED)
   │         │
   │         ├─> FULFILL_FAILED -> REFUNDED (PROMPT C4/D3)
   │         └─> REFUNDED
   ├─> EXPIRED   (tidak dibayar sampai expiry; QRIS default 15 menit)
   ├─> FAILED    (ditolak gateway)
   └─> CANCELLED (user membatalkan / ganti metode)
```

- **Format & Rotasi Idempotency Key (PROMPT D3):**
  - Format standar: `{session_id}:{package_id}:{buyer_attempt}`.
  - Nilai `buyer_attempt` dimulai dari integer `1`.
  - **Aturan rotasi:** `buyer_attempt` HANYA bertambah (increment +1) saat pengguna secara eksplisit memilih metode pembayaran baru atau menekan tombol coba lagi setelah order sebelumnya dinyatakan `FAILED`, `EXPIRED`, atau `CANCELLED`.
  - Retry otomatis jaringan atau klik ganda tombol yang sama TIDAK meng-increment `buyer_attempt`. Dengan demikian, server dan payment gateway menerima key yang identik dan menolak duplikasi order (idempoten).
- **Webhook handler idempoten**: proses hanya jika transisi valid (`PENDING -> PAID`); event duplikat mengembalikan `200 OK` tanpa efek ganda.
- **Verifikasi webhook:** signature/`server_key` hash, cocokkan `order_id`, `gross_amount`, `currency`; abaikan jika tidak cocok (log alert keamanan).
- **Fulfillment terpisah dari status bayar:** `PAID` memicu asynchronous job `FULFILL_ORDER` (buat entitlement + render HD) dengan 3x retry exponential backoff.
- **Penanganan FULFILL_FAILED & Kebijakan Refund Otomatis (PROMPT C4 & D3):**
  - Jika order sudah `PAID` namun proses render HD gagal permanen atau file foto mentah hilang karena anomali TTL storage sebelum komposit selesai:
    1. Order ditandai dengan status `FULFILL_FAILED`.
    2. Sistem menerbitkan alert prioritas P0 ke monitoring server / CS.
    3. Sistem otomatis memicu request refund ke API payment gateway (atau menjadwalkan tiket refund otomatis dengan SLA < 24 jam).
    4. Pengguna melihat notifikasi transparan: *"Maaf, terjadi kendala saat memproses frame HD kamu. Pembayaranmu telah kami proses untuk pengembalian 100% secara otomatis."*
- **Rekonsiliasi harian:** job membandingkan order `PENDING` > 20 menit dengan status di gateway (menangkap webhook yang hilang) dan menutup order kedaluwarsa.
- **Bayar terlambat:** jika `PAID` masuk setelah order `EXPIRED` (mis. user bayar tepat batas), server tetap memberikan entitlement bila gateway mengonfirmasi settlement.

## 12.8 UX Pembayaran (Salinan & Perilaku)

| Momen | Salinan |
|---|---|
| Pilih metode | "Bayar cepat: GoPay · ShopeePay · QRIS" |
| Menunggu | "Menunggu pembayaranmu... Setelah bayar, kamu akan kembali ke sini otomatis." |
| Kembali & sukses | "Pembayaran berhasil ✅ Frame HD-mu siap ❤️" |
| Kembali & pending | "Kami sedang memverifikasi pembayaranmu (biasanya < 10 detik)..." |
| Kedaluwarsa | "Waktu pembayaran habis. Pilih metode lagi. Fotomu aman kok." |
| Tab hilang | "Kamu kembali! Fotomu masih tersimpan di link ini." |
| Tersedia link | "Simpan link hasilmu ini biar bisa dibuka lagi" + tombol Copy/WhatsApp |

- Selalu tampilkan bahwa **foto aman** selama proses pembayaran.
- **Timer** hanya visual; kedaluwarsa otoritatif dari server.
- **Satu order aktif per sesi** pada satu waktu (mencegah duplikat).

## 12.9 Pengujian Wajib (Pembayaran)

| Skenario | Lulus jika |
|---|---|
| GoPay deeplink -> bayar -> kembali | Status PAID terdeteksi < 5 dtk setelah kembali |
| ShopeePay deeplink -> bayar -> tidak kembali manual | Webhook memicu fulfillment; link hasil dapat dibuka ulang |
| QRIS dinamis, scan dari ponsel lain | PAID via webhook; halaman asli update |
| QRIS same-device | Web Share API atau download Blob berfungsi lancar |
| Tab di-discard saat di app e-wallet | Reload -> status benar tanpa kehilangan hasil |
| Webhook terlambat/hilang | Return URL pull-check + rekonsiliasi menangkap |
| Klik bayar ganda | Satu order/charge terbuat (idempotensi) |
| In-app browser (IG/WA) | Banner "Buka di browser" + link bisa disalin |
| Bayar setelah expiry | Entitlement tetap diberikan sesuai kebijakan |
| Render HD gagal setelah PAID | Order beralih ke FULFILL_FAILED dan refund otomatis dipicu |

---

# 13. IN-APP BROWSER & KOMPATIBILITAS

## 13.1 Dukungan Browser
| Platform | Minimum |
|---|---|
| iOS | Safari 15+ (iOS 15+) |
| Android | Chrome 100+, Samsung Internet 18+ |
| Desktop | Chrome/Edge 100+, Safari 15+, Firefox 100+ |

## 13.2 In-App Browser (Risiko Sangat Tinggi di Indonesia)
Link dibagikan via WhatsApp/Instagram/TikTok/LINE/Facebook dan dibuka di WebView yang sering **memblokir `getUserMedia`** atau membatasi WebRTC.

**Deteksi:** UA (`Instagram`, `FBAN/FBAV`, `Line/`, `TikTok`/`musical_ly`, `; wv)` Android WebView) + uji `navigator.mediaDevices?.getUserMedia`.

**Penanganan:**
1. Tampilkan **halaman pencegat sebelum room**: *"Buka di Chrome/Safari untuk memakai kamera."*
2. Tombol **"Salin link"** + **"Buka di browser"** (Android: intent URL `intent://…#Intent;scheme=https;package=com.android.chrome;end`; iOS: petunjuk manual "titik tiga → Buka di Safari").
3. Ukur `inapp_block_rate` sebagai metrik utama funnel partner join.
4. Sediakan **link pendek** yang bersih (`satuframe.id/j/7K29XQ`) agar mudah disalin.

## 13.3 Izin Kamera
- Instruksi visual per browser bila `NotAllowedError`.
- Deteksi kamera dipakai aplikasi lain (`NotReadableError`) → "Tutup aplikasi lain yang memakai kamera".
- Mode privat/tanpa HTTPS tidak didukung; seluruh situs HTTPS.

## 13.4 Manajemen Siklus Hidup Halaman
- **Page Visibility API:** saat tab hidden selama sesi aktif → jeda otomatis (`RECONNECTING`), countdown dibatalkan.
- **Wake Lock API** (`navigator.wakeLock.request('screen')`) aktif selama sesi agar layar tidak mati; fallback video senyap bila tak didukung.
- Peringatan orientasi: kunci portrait; deteksi rotasi memicu jeda.

---

# 14. PRIVASI, CONSENT & KEPATUHAN UU PDP

## 14.1 Prinsip
> **Pengguna memiliki memori mereka.** Foto tidak dipakai untuk pelatihan AI, iklan, atau pengenalan wajah tanpa persetujuan eksplisit.

## 14.2 Consent Dua Pihak & 6 Elemen Consent Eksplisit (PROMPT E1)
- Sebelum kamera aktif dan sebelum streaming WebRTC dimulai, **kedua peserta** wajib memberikan persetujuan eksplisit 2 langkah (*two-step explicit consent*).
- Tanpa consent dari kedua belah pihak, sesi foto tidak akan pernah dimulai (Ready Gate diblokir).
- **6 Elemen Consent Eksplisit Wajib (Sesuai UU PDP):**
  1. **Tujuan Pemrosesan:** Pemrosesan gambar semata-mata untuk menghasilkan kolase photobooth digital bersama pasangan/teman secara real-time.
  2. **Jenis Data:** Foto visual wajah beresolusi tinggi (Data Sensitif), metadata teknis perangkat (estimasi lag kamera, user-agent), dan cap waktu capture.
  3. **Masa Retensi:** Penyimpanan sementara maksimal 24 jam untuk foto mentah (*raw shots*), dan 7 hari untuk hasil akhir photostrip bagi pengguna tamu (*guest*).
  4. **Pihak Ketiga Pemroses Data:** Penyimpanan cloud terenkripsi (Cloudflare R2) dan pemrosesan transaksi berizin Bank Indonesia (Midtrans / Xendit).
  5. **Hak Subjek Data:** Hak untuk menarik persetujuan, meminta pengunduhan data, dan menghapus seluruh kontribusi foto kapan saja sebelum batas retensi habis.
  6. **Audit Trail Persetujuan:** Setiap tindakan persetujuan mencatat metadata bukti: `{ participant_id, consent_version, timestamp_utc, ip_hash, user_agent }`.
- **Hak Penarikan Foto:** Siapa pun dapat menarik fotonya kapan saja sebelum TTL; hasil gabungan di server langsung dihapus atau dirender ulang tanpa foto pihak terkait.
- **Public Page (V1):** Fitur halaman publik hanya aktif jika **kedua pihak** memilih *opt-in*; pengaturan default adalah privat/unlisted.

## 14.3 Kepatuhan UU No. 27/2022 (PDP) & Klasifikasi Data Sensitif
- **Klasifikasi Data Sensitif (UU PDP Pasal 4 Ayat 2 Huruf e):**
  Foto wajah dan rekaman visual individu diklasifikasikan secara tegas sebagai **Data Pribadi yang Bersifat Spesifik / Data Sensitif** (data biometrik pengenalan individu). Hal ini menuntut standar keamanan tingkat tinggi, pembatasan akses ketat berbasis signed URL berdurasi pendek, enkripsi at-rest (AES-256) dan in-transit (TLS 1.3), serta minimasi data.
- **Kebijakan Privasi:** Berbahasa Indonesia resmi, memuat rincian tujuan pemrosesan, hak subjek data, retensi, dan daftar sub-prosesor pihak ketiga.
- **Hak Subjek Data:** Akses, koreksi, penarikan persetujuan, dan penghapusan data tersedia secara mandiri melalui UI aplikasi dan email support.
- **Minimasi Data:** Tidak mengumpulkan data lokasi presisi (GPS). Informasi lokasi seperti kota/zona waktu hanya berupa input manual opsional.
- **Batas Usia & Perlindungan Anak:** Ketentuan layanan membatasi usia minimum 17+ (atau 13+ dengan izin wali sah). **Wajib melibatkan penasihat hukum / Data Protection Officer (DPO) bersertifikasi PDP Indonesia** sebelum peluncuran Public Beta untuk validasi kepatuhan hukum operasional.
- **Transfer Lintas Negara:** Infrastruktur cloud yang berada di region internasional (misal Cloudflare global edge/R2) dinyatakan secara transparan dalam dokumen Kebijakan Privasi sesuai Pasal 56 UU PDP.

## 14.4 Retensi & Penghapusan (SLA 72 Jam)
- Lihat tabel siklus hidup retensi di §11.5.
- Tombol **"Hapus semua data sesi ini"** tersedia langsung pada halaman hasil (`/r/:token`).
- **SLA Penghapusan Data:** Ketika pengguna meminta penghapusan data mandiri:
  - File foto mentah di object storage (R2) dan cache canvas dihapus seketika (*instant purge*).
  - Metadata foto di database di-hard delete atau di-anonymize dalam waktu **maksimal 72 jam** (memenuhi batas kepatuhan regulasi PDP).
  - Log keuangan dan catatan transaksi order disimpan terpisah dengan retensi minimum sesuai ketentuan akuntansi perpajakan Republik Indonesia tanpa memuat aset visual foto.

## 14.5 Moderasi
- Tombol **Laporkan** pada halaman hasil publik/tautan.
- Tidak ada feed publik di MVP.
- Tidak ada perekaman video yang disimpan; stream WebRTC hanya transit P2P.

---

# 15. DATA MODEL

```text
users(id, email, auth_provider, created_at, deleted_at)                       [V1]
sessions(id, room_code, creator_participant_id, template_id, template_version,
         state, state_version, shot_count_target, shot_count_saved,
         retake_used, tier, result_token, created_at, connected_at,
         completed_at, expires_at, ttl_at)
participants(id, session_id, role[creator|partner], display_name,
             user_id NULL, consent_at, device_class, device_lag_ms,
             ws_last_seen_at, joined_at)
session_photos(id, session_id, participant_id, shot_no, storage_key, sha256,
               bytes, width, height, status[LOCAL|UPLOADING|SAVED|FAILED|DESYNC],
               t_frame_server_est, created_at, expires_at)
session_events(id, session_id, event_id UNIQUE, type, payload_json, state_version, created_at)
templates(id, name, category, version, preview_url, asset_urls, slots_json,
          aspect_ratio, is_premium, active, released_at)
renders(id, session_id, profile, engine[client|server], status, storage_key,
        bytes, width, height, watermark, created_at, expires_at)
packages(id, name, price_idr, session_count, valid_days, features_json, active)
orders(id, session_id NULL, user_id NULL, buyer_email NULL, package_id,
       amount_idr, status[PENDING|PAID|FAILED|EXPIRED|CANCELLED|REFUNDED|FULFILL_FAILED],
       method[gopay|shopeepay|qris|va|other], gateway, gateway_ref,
       idempotency_key UNIQUE, photos_hold_until NULL, expires_at, paid_at,
       fulfilled_at, created_at)
payment_events(id, order_id, gateway_event_id UNIQUE, payload_json, signature_ok, received_at)
entitlements(id, order_id, session_id NULL, owner_key, sessions_total, sessions_used, expires_at)
vouchers / referrals / referral_rewards                                        [V1]
analytics_events(id, name, session_id NULL, anon_id, props_json, created_at)
admin_users(id, email, role, last_login_at)
audit_logs(id, actor_id, action, target, meta_json, created_at)
```

**Catatan Arsitektur Data:**
- `sessions.state_version` untuk kontrol konkurensi optimistik (optimistic locking) atomik per mutasi.
- `session_events` (append-only) memungkinkan rekonstruksi dan debugging state machine sesi secara deterministik.
- `orders.photos_hold_until` menyimpan batas waktu perlindungan retensi foto mentah saat transaksi pembayaran berstatus `PENDING` (`expires_at + 48 hours`).
- `orders.idempotency_key` menjamin satu tagihan per percobaan transaksi pengguna (`{session_id}:{package_id}:{buyer_attempt}`).
- `payment_events.gateway_event_id UNIQUE` menjamin webhook pembayaran idempoten tanpa eksekusi ganda.

**11 Indeks Wajib Basis Data (PROMPT G2):**

| No | Tabel & Kolom Indeks | Alasan Teknis / Pola Akses |
|---|---|---|
| 1 | `sessions(room_code)` | Resolusi room cepat saat partner membuka tautan sesi |
| 2 | `sessions(state, updated_at)` | Pemindaian job reaper untuk sesi kedaluwarsa / abandon |
| 3 | `participants(session_id, id)` | Query verifikasi keikutsertaan peserta dalam sesi |
| 4 | `participants(session_id, role)` | Otentikasi dan autorisasi aksi creator vs partner |
| 5 | `session_photos(session_id, shot_no)` | Agregasi dan kompilasi foto saat perakitan kanvas final |
| 6 | `session_photos(expires_at)` | Pembersihan berkala (*TTL reaper*) file storage fisik |
| 7 | `session_events(session_id, state_version DESC)` | Pengambilan riwayat mutasi state dan event replay |
| 8 | `orders(idempotency_key)` | Pengecekan kilat pencegahan duplicate charge pembayaran |
| 9 | `orders(session_id, status)` | Verifikasi hak akses HD (entitlement) per sesi aktif |
| 10 | `orders(photos_hold_until)` | Pengecekan kunci hold agar pembersih TTL tidak menghapus foto order pending |
| 11 | `payment_events(gateway_event_id)` | Deduplikasi kilat notifikasi webhook payment gateway |

---

# 16. API & EVENT CONTRACT (RINGKAS)

## 16.1 REST (API v1)

Seluruh endpoint layanan utama menggunakan prefiks `/api/v1/` untuk menjamin stabilitas kontrak data klien dan server.

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/health` | Healthcheck kesiapan infrastruktur (DB pool, Cloudflare R2 storage) |
| GET | `/api/version` | Informasi nomor versi rilis aplikasi, build commit sha, dan skema API |
| POST | `/api/v1/sessions` | Buat sesi baru (guest) -> `{session_id, room_code, participant_token}` |
| POST | `/api/v1/sessions/:code/join` | Partner bergabung + consent 2 langkah -> `participant_token` |
| GET | `/api/v1/sessions/:id/state` | Snapshot otoritatif sesi untuk sinkronisasi dan resume |
| POST | `/api/v1/sessions/:id/shots/:n/upload-url` | Presigned URL upload ke storage objek R2 |
| POST | `/api/v1/sessions/:id/shots/:n/commit` | Konfirmasi upload foto mentah lokal (idempoten) |
| POST | `/api/v1/sessions/:id/retake` | Ajukan permintaan retake foto ke-n |
| POST | `/api/v1/sessions/:id/render` | Minta fallback render server-side (atau ekspor cetak 4R) |
| DELETE | `/api/v1/sessions/:id` | Hapus instan seluruh data foto dan metadata sesi (SLA 72 jam) |
| POST | `/api/v1/orders` | Buat order pembayaran (wajib sertakan `idempotency_key`) |
| GET | `/api/v1/orders/:id/status` | Cek status pembayaran order (termasuk pull-check ke gateway) |
| POST | `/api/v1/webhooks/payment` | Webhook notifikasi pembayaran dari gateway (verifikasi signature) |
| GET | `/api/v1/results/:token` | Pengambilan data frame hasil akhir + tier unduhan |
| GET | `/api/v1/time` | Endpoint sinkronisasi waktu NTP-lite berlatensi rendah |

**Kebijakan Versioning API (PROMPT G1):**
- Setiap perubahan non-kompatibel (*breaking change*) pada payload JSON atau kontrak perilaku mewajibkan kenaikan versi ke `/api/v2/`.
- Penghentian rute API lama (*deprecation*) wajib menyertakan HTTP header standar RFC 8594 (`Sunset` dan `Deprecation`) dengan masa transisi minimal 30 hari.

## 16.2 Event WebSocket

Koneksi WebSocket real-time bertindak sebagai media pertukaran event dan koordinasi state machine antar-klien.

| Event | Arah | Payload utama | Deskripsi / Peran |
|---|---|---|---|
| `PRESENCE` | S->C | `participants`, `status` | Status kehadiran partner dan koneksi WebRTC |
| `TIME_PING` / `TIME_PONG` | C<->S | `t0`, `ts`, `t1` | Sinkronisasi offset jam dinding (NTP-lite) |
| `READY` | C->S | `ready`, `device_lag_ms`, `offset_ms`, `tab_visible` | Pernyataan kesiapan peserta untuk Ready Gate |
| `SCHEDULE_CAPTURE` | S->C | `shot_no`, `t_target_server`, `pose_id`, `state_version` | Penjadwalan countdown jepretan dari server |
| `CAPTURE_ABORT` | C->S | `shot_no`, `reason: 'TAB_HIDDEN'`, `timestamp` | Pembatalan countdown seketika saat tab hidden (PROMPT A4) |
| `ACK_CAPTURE` | C->S | `shot_no`, `t_frame_server_est`, `lag_used` | Konfirmasi frame telah diambil dari ring buffer |
| `SHOT_SAVED` | S->C | `shot_no`, `state_version` | Konfirmasi kedua sisi foto telah ter-commit ke storage |
| `SHOT_DESYNC` | S->C | `shot_no`, `delta_ms` | Peringatan desync melebihi toleransi p95 (tawarkan retake) |
| `COMPOSITING_ALIVE` | C->S | `session_id`, `progress_pct`, `timestamp` | Heartbeat keepalive tiap 2 dtk saat canvas dirender (PROMPT B3) |
| `STATE_SNAPSHOT` | S->C | snapshot penuh sesi | Payload rekonsiliasi state saat reconnect atau error |
| `PAYMENT_PAID` | S->C | `order_id`, `result_token` | Broadcast status pembayaran berhasil |
| `ERROR` | S->C | `code`, `message` | Notifikasi penolakan aksi atau kegagalan sistem |

Semua event membawa `event_id` (UUID v4) untuk deduplikasi idempoten dan `state_version` untuk verifikasi konsistensi state.

---

# 17. SECURITY & ANTI-ABUSE

- HTTPS di seluruh permukaan; HSTS.
- `room_code` **≥ 8 karakter acak** (base32, ~40 bit) + kedaluwarsa; `result_token` ≥ 128-bit.
- `participant_token`: JWT pendek dengan `session_id` + `role`; diverifikasi tiap koneksi WS & API.
- **Signed URL** upload/unduh, kedaluwarsa singkat (≤ 10 menit unggah, ≤ 1 jam unduh).
- Validasi upload: ukuran maks (mis. 3 MB), magic bytes JPEG, dimensi, sha256 sesuai; tolak selain itu.
- Rate limiting: pembuatan room per IP/perangkat (mis. 10/jam), render (5/jam/sesi), order (5/jam), join (30/jam/IP).
- CAPTCHA adaptif (Turnstile) saat anomali.
- Webhook: verifikasi signature, cek IP allowlist bila disediakan gateway, idempotensi, cocokkan nominal.
- Watermark & tier diterapkan **server-side** untuk ekspor resmi.
- Tidak menyimpan data kartu/e-wallet; hanya `gateway_ref`.
- Audit log aksi admin; backup DB terjadwal; secret di secret manager.
- Proteksi enumerasi: respons seragam untuk `room_code` tidak valid.
- Header keamanan (CSP, X-Content-Type-Options, Referrer-Policy) dan CORS ketat.

---

# 18. ANALYTICS & METRIK

**North Star:** *Completed Shared Memories* per minggu.

## 18.1 Funnel & Target Awal (Hipotesis)

| Tahap | Metrik | Target |
|---|---|---|
| Landing -> room dibuat | Activation | 15-25% |
| Room dibuat -> partner join | Connection | **>= 60%** |
| Join -> sesi selesai | Completion | >= 75% |
| Selesai -> bayar | Conversion | 8-15% |
| Selesai -> share | Share rate | >= 40% |
| Beli -> beli lagi (60 hari) | Repeat | >= 20% |

## 18.2 Metrik Teknis (Guardrail)

| Metrik | Target |
|---|---|
| Waktu landing -> foto pertama (median) | < 2 menit |
| ΔT capture (p95, lintas perangkat) | < 350 ms |
| Persentase shot `DESYNC` | < 5% |
| Sesi yang berhasil di-resume setelah disconnect | >= 90% |
| Render klien sukses tanpa fallback | >= 95% |
| Fallback server sukses | >= 99% |
| Crash/reload iOS saat render | < 1% |
| Blokir in-app browser | dipantau (target < 15% dari partner join gagal) |
| Payment: PAID terdeteksi < 10 dtk setelah kembali ke tab | >= 95% |
| Webhook terlambat > 60 dtk | < 2% |

## 18.3 Event Analytics Inti
`landing_view`, `create_room`, `share_link_click`, `partner_join`, `inapp_browser_blocked`, `camera_granted/denied`, `device_check_pass/fail`, `ready_both`, `shot_captured{n, delta_ms, lag_ms}`, `shot_desync`, `disconnect{state}`, `resume_success/fail`, `render_client_ok/fail`, `render_fallback`, `result_view`, `paywall_view`, `pay_method_selected`, `pay_deeplink_open`, `pay_return`, `pay_paid`, `pay_expired`, `download_free/hd`, `share_click{channel}`, `session_from_share`, `creator_from_share`, `watermark_attribution_click`.

## 18.4 Viral Coefficient & K-Factor (Metrik Utama - PROMPT F3)

Viral coefficient (K-Factor) dipantau mingguan sejajar dengan North Star Metric sebagai syarat mutlak kelangsungan produk:

$$\text{K} = \text{share\_rate} \times \text{avg\_shares\_per\_session} \times \text{view\_to\_creator\_rate}$$

| Komponen Formula | Definisi | Target Awal |
|---|---|---|
| `share_rate` | Rasio sesi selesai yang membagikan hasil photostrip ke media sosial / chat | >= 40% |
| `avg_shares_per_session` | Rata-rata jumlah kanal / penerima per aksi berbagi | >= 1.5 |
| `view_to_creator_rate` | Rasio penerima yang mengklik watermark/link dan membuat room baru | >= 5% |
| **K-Factor Gabungan** | **Jumlah pengguna baru yang dihasilkan oleh setiap 1 pengguna aktif** | **K >= 0.3** |

*Rasional:* Karena paid advertising tidak layak secara unit economics, produk wajib memiliki mesin viral organik mandiri (K >= 0.3) agar pertumbuhan tidak stagnan.

---

# 19. UNIT ECONOMICS (PROMPT E2)

Analisis biaya variabel per sesi berbayar (nominal paket 1 sesi: Rp15.000):

| Komponen Biaya | Skenario Optimistis (PRD v2.1) | Skenario Realistis Indonesia (PRD v2.2) | Catatan & Asumsi Pasar Indonesia |
|---|---|---|---|
| **Payment Gateway Fee** | Rp105 - Rp300 (0,7% QRIS) | **Rp2.000** (Minimum Fixed Fee) | Gateway Indonesia (Midtrans/Xendit) menerapkan minimum fee Rp2.000/transaksi QRIS/e-wallet untuk nilai kecil. Pada transaksi Rp15.000, fee memotong **13,3%** dari omzet. |
| **TURN Relay Bandwidth** | Rp50 - Rp300 (10-20% sesi) | **Rp600 - Rp900** (50-60% sesi) | Operator seluler Indonesia (Telkomsel/Indosat/XL) menerapkan Symmetric NAT ketat. WebRTC P2P gagal pada 50-60% sesi. Cloudflare Calls (cap 400 kbps, 10 mnt) membutuhkan biaya relay riil ~Rp750/sesi relay. |
| **Storage & Egress** | < Rp50 | **Rp50** | Cloudflare R2 (8 raw shots + 1 strip HD = ~15 MB total, TTL 24 jam - 7 hari). Egress gratis. |
| **Signaling & State Machine** | < Rp50 | **Rp50** | Pertukaran WebSocket dan mutasi PostgreSQL/Redis. |
| **Fallback Render Server** | < Rp30 | **Rp100** | Beban komputasi Node.js Sharp container jika ~15% sesi klien mobile mengalami fallback. |
| **Pajak (Tax)** | ±Rp1.500 | **Rp75 - Rp1.650** | PPh Final UMKM 0,5% (PP 55/2022 = Rp75) jika berbadan usaha PT Perorangan; atau PPN 11% (Rp1.650) jika PKP. |
| **Total Biaya Variabel** | **±Rp2.000 - Rp2.500** | **±Rp3.500 - Rp4.700** | **Biaya riil di Indonesia 75% lebih tinggi dari estimasi optimis.** |
| **Contribution Margin** | **±Rp12.500 (~83%)** | **±Rp10.300 - Rp11.500 (~68% - 76%)** | Masih positif dan sehat, namun tidak menyisakan ruang untuk iklan berbayar. |

**Catatan Kritis Investor & CAC Reality Check (PROMPT E2):**
1. **Larangan Mutlak Paid Acquisition:**
   - Biaya akuisisi pengguna berbayar (CAC) melalui iklan digital (Meta Ads, TikTok Ads, Google Ads) untuk segmen consumer/social di Indonesia berada di kisaran **Rp55.000 hingga Rp104.000** per paying user.
   - Dengan Contribution Margin Rp10.300 - Rp11.500 per transaksi, pengeluaran iklan berbayar akan menghasilkan rasio LTV:CAC < 0,2:1 yang menghancurkan modal kerja.
   - **Satu Frame HANYA VIABLE dengan strategi 100% Organik, UGC di TikTok/Instagram Reels, dan Watermark Viral Loop (K-Factor >= 0.3).**
2. **Strategi Negosiasi Payment Gateway:**
   - Setelah volume transaksi mencapai skala > 10.000 transaksi/bulan, tim wajib mengajukan negosiasi volume-based pricing ke payment gateway agar transaksi mikro (< Rp20.000) dibebaskan dari minimum fee Rp2.000 dan kembali ke skema MDR murni 0,7% (Rp105), yang akan mendongkrak margin kembali ke > 80%.

---

# 20. RISIKO & MITIGASI

| Risiko | Prob. | Dampak | Mitigasi |
|---|---|---|---|
| Shutter lag beragam → desync | Tinggi | Sedang | Kalibrasi lag, pre-roll buffer, countdown seragam, toleransi realistis (§9) |
| iOS Safari crash saat render | Tinggi | Tinggi | Batas 8 MP, satu kanvas, `ImageBitmap`, fallback server (§10) |
| Disconnect saat sesi | Sangat tinggi | Tinggi | Server otoritatif, incremental persistence, resume (§11) |
| Tab beku saat bayar di e-wallet | Sangat tinggi | Tinggi | Webhook, return URL, `visibilitychange`, result token (§12) |
| In-app browser blok kamera | Sangat tinggi | Tinggi | Deteksi + pencegat + salin link (§13) |
| Deep link e-wallet gagal | Sedang | Sedang | Fallback QRIS + pesan jelas |
| Webhook hilang/terlambat | Sedang | Sedang | Pull-check + rekonsiliasi harian |
| TURN mahal | Sedang | Sedang | Preview rendah, monitor, pilih provider murah |
| Kompetitor meniru | Tinggi | Sedang | Fokus reliabilitas, kualitas, retensi |
| CAC tinggi | Sedang | Tinggi | Organik/UGC, viral loop watermark |
| Isu privasi/UU PDP | Sedang | Tinggi | Consent 2 pihak, retensi singkat, konsultasi hukum |
| Penyalahgunaan konten | Sedang | Tinggi | Tanpa galeri publik, report, moderasi |
| Retensi rendah (momen jarang) | Tinggi | Tinggi | Kalender momen, timeline (V1) |
| Kuota storage/IndexedDB terbatas | Sedang | Rendah | Batas 20 MB lokal, fallback memori |

---

# 21. NON-FUNCTIONAL REQUIREMENTS

| Aspek | Target |
|---|---|
| LCP landing (4G) | < 2,5 dtk |
| Room creation | < 2 dtk |
| Partner join | < 5 dtk |
| Sinkronisasi capture | p95 ΔT < 350 ms (lihat §9.6 per kelas perangkat) |
| Kalibrasi lag (device check) | < 4 dtk |
| Upload per foto (4G) | < 4 dtk (p95) |
| Render klien | < 5 dtk (perangkat menengah), timeout 12 dtk |
| Render fallback server | p95 < 6 dtk |
| Deteksi pembayaran setelah kembali | < 5 dtk (p95) |
| Ketersediaan | ≥ 99% (MVP) |
| Skalabilitas awal | 500 room konkuren, 50 render server konkuren |
| Retensi & penghapusan | Otomatis via TTL/lifecycle (§11.5) |
| Browser | iOS Safari 15+, Chrome/Edge 100+, Samsung Internet 18+ |
| Aksesibilitas | Kontras WCAG AA, label tombol, instruksi kamera jelas, audio countdown punya padanan visual |
| Lokalisasi | Bahasa Indonesia (utama), Inggris |
| Observabilitas | Log terstruktur, tracing sesi (`session_id`), alert pada webhook gagal, error render, lonjakan desync |
| Backup | Harian, retensi 7 hari (data transaksi) |
| Responsif | 360 / 390 / 430 / 768 / 1024 / 1440 px |

---

# 22. RENCANA VALIDASI & KRITERIA KILL/PIVOT

## 22.1 Validasi Harga
Sinyal awal (n=5 teman) **lemah**. Tindak lanjut:
1. Pre-order/DP ringan (Rp5K) atau waitlist berbasis WhatsApp untuk 20-30 orang non-teman.
2. Uji dua harga (mis. Rp10K vs Rp15K vs Rp20K) via fake-door di prototipe.
3. Pertanyaan alternatif: "Sekarang kamu foto bareng LDR pakai apa? Pernah bayar? Berapa?"
4. Uji model freemium: konversi "coba gratis -> bayar HD".

## 22.2 Hipotesis

| # | Hipotesis | Uji | Sukses jika |
|---|---|---|---|
| H1 | Target mau memakai | Landing + waitlist + uji organik | Waitlist conv >= 10% |
| H2 | Sinkron & kualitas memadai | Prototipe 2 perangkat | Capture sukses >= 90% (iOS+Android), p95 ΔT < 350 ms |
| H3 | Mau bayar | Fake-door / transaksi nyata | >= 8% bayar |
| H4 | Partner join tanpa friksi | 20-30 pasangan nyata | Join rate >= 60% |
| H5 | Hasil dibagikan | 50 sesi awal | Share rate >= 40% |
| H6 | Sesi tahan gangguan | Uji disconnect paksa | Resume sukses >= 90% |
| H7 | Pembayaran e-wallet mulus | 30 transaksi uji | PAID terdeteksi < 10 dtk >= 95% |
| H8 | Pertumbuhan viral organik (PROMPT F3) | Tracking link referral & watermark frame | K-Factor >= 0.3 |

## 22.3 Kriteria Kill/Pivot (PROMPT F3)
- **K-Factor < 0.15 selama 4 minggu berturut-turut** setelah peluncuran publik DAN CAC berbayar > Rp25.000: Evaluasi pivot ke model **B2B Event Photobooth** atau white-label brand activations.
- **Join rate < 40%** setelah perbaikan UX: Evaluasi friksi mendasar pada alur in-app browser atau otorisasi kamera.
- **Completion < 50%**: Masalah teknis stabilitas WebRTC atau crash canvas fatal.
- **Nol pembayaran di 50+ sesi berbayar**: Uji ulang proposisi nilai frame HD atau ganti model monetisasi.
- **p95 ΔT > 600 ms konsisten** di Android mid-level: Pertimbangkan pendekatan alternatif (mis. mode "sequential capture" dengan komposisi pose terpandu).

---

# 23. ROADMAP (PROMPT F1 & F2)

```text
FASE 0.5 (2-3 mgg) TECHNICAL SPIKES (PROMPT F2)
  • Spike 1: WebRTC Reality Check (TURN Cloudflare Calls di Telkomsel/Indosat/XL, cap 400 kbps)
  • Spike 2: iOS Memory Safety (Batas canvas 8 MP, createImageBitmap, bebas OOM iPhone SE/8)
  • Spike 3: Payment Deep Link Recovery (bfcache, return URL, pemulihan order state)

FASE 0 (2-3 mgg) VALIDASI & LEGAL SETUP (PROMPT F1)
  • Registrasi entitas hukum (PT Perorangan / CV) & pengajuan KYB merchant account payment gateway
  • Landing + waitlist berbasis WhatsApp/organik
  • Rekrutmen 20-30 pasangan uji coba nyata

FASE 1 (8-10 mgg) MVP (1 Senior + 1 Mid Dev) (PROMPT F1)
  • P0 lengkap: Sinkronisasi 3-tier, pre-roll buffer 960px, server Ready Gate
  • Rendering canvas 8 MP, deteksi crash-loop IndexedDB kebal bfcache, fallback sharp
  • State machine atomik (state_version), write-ahead durabel IndexedDB, COMPOSITING_ALIVE
  • Payment: QRIS dinamis + deep link e-wallet timeout 3.5s + auto-refund FULFILL_FAILED
  • Kepatuhan UU PDP: Consent 2 langkah eksplisit 6 elemen, SLA purge 72 jam, review DPO
  • Admin dasar + analytics event & K-Factor tracking

FASE 2 (6-8 mgg) GROWTH & RETENSI
  • Akun pengguna + Memory Gallery • Kalender Momen • Referral • Template musiman

FASE 3 EKSPANSI
  • Linimasa Memori • Animated memory • Group booth 3-4 orang • B2B event activations
```

*(Estimasi realistis untuk tim inti 1 senior engineer + 1 mid-level engineer.)*

---

# 24. ACCEPTANCE CRITERIA MVP (PROMPT F1)

**Sinkronisasi (§9)**
- [ ] Kalibrasi lag berjalan otomatis di device check dan mengunci mode `grab` jika lag > 600 ms atau `takePhoto` tidak didukung.
- [ ] Ready Gate server-side memblokir countdown jika salah satu peserta belum terverifikasi atau tab tidak aktif.
- [ ] Countdown 3-2-1 dengan bip Web Audio + fallback visual/getar; audio di-unlock pada interaksi awal.
- [ ] Capture memakai ring buffer pre-roll resolusi optimal 960px; frame dipilih berdasarkan `t_frame` terdekat ke target.
- [ ] p95 ΔT < 350 ms pada matriks uji §9.8; shot melewati batas keras ditandai `DESYNC` dan ditawarkan retake gratis.
- [ ] Event `CAPTURE_ABORT` seketika membatalkan countdown jika salah satu peserta memindahkan tab ke background.

**Rendering (§10)**
- [ ] Kanvas final <= 8 MP; satu kanvas pada satu waktu; `ImageBitmap` dilepas segera; canvas di-zero-kan setelah `toBlob`.
- [ ] Tidak ada crash/reload di iPhone SE/8 pada 5x render Standard berturut-turut.
- [ ] Deteksi crash-loop berbasis IndexedDB kebal pemulihan bfcache iOS (`pageshow.persisted`).
- [ ] Fallback server otomatis aktif pada kegagalan, crash-loop, atau perangkat low-memory; sukses >= 99%.
- [ ] Selama render klien berlangsung, event `COMPOSITING_ALIVE` terkirim tiap 2 detik untuk menjaga koneksi WebSocket.
- [ ] Watermark & tier diterapkan server-side untuk ekspor resmi.

**State & Resume (§11)**
- [ ] Server otoritatif; mutasi `state_version` berjalan atomik dalam transaksi basis data tunggal.
- [ ] Setiap foto ditulis ke IndexedDB dengan menunggu `transaction.oncomplete` sebelum request upload URL presigned.
- [ ] Safari Private Mode mengaktifkan fallback in-memory Map + upload segera + banner peringatan.
- [ ] Refresh tab pada shot 2 dari 4: sesi dilanjutkan dari shot 2 tanpa mengulang shot 1.
- [ ] Disconnect > 90 dtk -> `PAUSED`; resume dalam 30 menit berhasil tanpa kehilangan foto tersimpan.
- [ ] TTL foto mentah terkunci (`photos_hold_until`) selama order pembayaran berstatus `PENDING`.

**Pembayaran & Legalitas (§12, §14, §15 - PROMPT F1)**
- [ ] Akun merchant payment gateway aktif berstatus produksi (KYB approved) dengan NPWP badan usaha/perorangan terverifikasi sebelum transaksi publik dibuka.
- [ ] Opsi bayar: GoPay deep link, ShopeePay deep link, QRIS dinamis (dengan Web Share API dan tombol download same-device).
- [ ] Deep link timeout 3.500 ms dengan tombol batal / ganti metode yang tetap dapat diakses setiap saat.
- [ ] Format idempotency key `{session_id}:{package_id}:{buyer_attempt}` mencegah duplikasi order dan tagihan ganda.
- [ ] Order `PAID` yang mengalami kegagalan komposit permanen otomatis beralih ke `FULFILL_FAILED` dan memicu proses refund 100%.
- [ ] Return URL memverifikasi status instan; `visibilitychange`/`pageshow` memicu cek segera.
- [ ] Tab yang di-discard/reload dipulihkan ke state pembayaran yang benar via `order_id`/`result_token`.
- [ ] Consent 2 langkah eksplisit mencakup 6 elemen data sensitif sesuai UU No. 27/2022 Pasal 4(2).
- [ ] Tombol hapus data sesi menghapus storage seketika dan membersihkan metadata dalam SLA < 72 jam.
- [ ] Basis data menerapkan 11 indeks wajib (§15) untuk performa query dan integritas TTL.

**Umum**
- [ ] In-app browser terdeteksi dan dicegat sebelum room dengan panduan pembukaan di browser sistem asli.
- [ ] Data guest terhapus otomatis sesuai TTL efektif.
- [ ] Tidak ada foto yang dapat diakses tanpa token/signed URL.
- [ ] Admin dashboard menampilkan metrik sesi, revenue, completion rate, dan estimasi K-Factor.

---

# 25. APPENDIX

## 25.1 Visi Jangka Panjang (Bukan Build Saat Ini)
Memory Cloud, marketplace template kreator, desain berbantuan AI, kampanye brand/event, animated MP4, group booth, public gallery.

## 25.2 Glosarium
| Istilah | Arti |
|---|---|
| **Ready Gate** | Syarat teknis yang harus lolos sebelum countdown dijadwalkan |
| **Pre-roll buffer** | Ring buffer frame kamera sebelum/sekitar waktu target capture |
| **ΔT** | Selisih waktu capture antara dua perangkat pada shot yang sama |
| **Device lag** | Latensi pipeline capture perangkat (trigger -> frame) |
| **Write-ahead** | Menulis ke penyimpanan lokal sebelum upload |
| **Result token** | Token acak permanen untuk membuka hasil tanpa akun |
| **K-Factor** | Koefisien viralitas yang mengukur rata-rata pengguna baru per pengguna aktif |

## 25.3 Keputusan Terbuka (PROMPT F1)
1. **Gateway final (Midtrans vs Xendit):** Berdasarkan kecepatan verifikasi KYB merchant account dan performa deep link e-wallet riil pada fase pengujian.
2. **Batas usia final & persetujuan wali:** Berdasarkan evaluasi akhir bersama konsultan hukum bersertifikasi PDP Indonesia.
3. **Penerapan auto frame selection berbasis kualitas wajah:** Ditunda ke V1 agar MVP fokus penuh pada stabilitas sinkronisasi dan rendering.

---

*Dokumen ini adalah baseline teknis PRD Satu Frame v2.2. Semua angka target/estimasi (toleransi, biaya, konversi) adalah **hipotesis** yang wajib divalidasi melalui prototipe dan data nyata sebelum dikunci.*
