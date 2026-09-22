# Panduan Konfigurasi Gateway Pembayaran Midtrans

Dokumen ini menjelaskan langkah-langkah untuk menghubungkan Satu Frame dengan akun merchant Midtrans untuk menerima pembayaran QRIS Dinamis dan e-wallet GoPay/ShopeePay secara langsung.

---

## 1. Variabel Lingkungan (.env.local)

Salin berkas template ke `.env.local` lalu isi kredensial akun Midtrans Anda:

```env
# Mode Midtrans: false untuk Sandbox (pengujian), true untuk Produksi (transaksi rupiah nyata)
MIDTRANS_IS_PRODUCTION=false

# Kredensial Server & Client Key dari Dashboard Midtrans (Settings -> Access Keys)
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxx
MIDTRANS_MERCHANT_ID=Gxxxxxxxxx
```

> **Catatan:** Jika `MIDTRANS_SERVER_KEY` dibiarkan kosong atau tidak valid, aplikasi secara otomatis mengaktifkan **Simulator Lokal**, sehingga alur pembayaran tetap dapat diuji secara penuh tanpa memerlukan koneksi ke gateway eksternal.

---

## 2. Pengaturan Notification Webhook URL

Buka Dashboard Midtrans -> **Settings** -> **Configuration**:
1. **Payment Notification URL:**
   `https://domain-anda.com/api/webhooks/payment`
2. Atur format respons ke **JSON**.
3. Simpan konfigurasi.

Webhook ini adalah sumber kebenaran otoritatif (*authoritative source of truth*) yang akan otomatis membuka hak akses unduh HD dan menambah kuota linimasa saat pelanggan berhasil membayar.
