# wa-yt-bot

Bot WhatsApp yang otomatis mengambil 3 video terbaru dari channel YouTube (default: `@motivationalresource`), memotong 30 detik pertama, mengompres ke MP4 (<16MB), lalu mengunggah sebagai Status WhatsApp secara berkala.

## Status Proyek

⚠️ **Saat ini alur unggah status belum berhasil di perangkat pengguna.** Bot dapat login (QR tampil), mengunduh & memotong video, namun status tidak muncul di WA. Dibutuhkan investigasi lanjutan pada pengiriman status via Baileys.

## Prasyarat

- Node.js 18+ (yarn/npm)
- ffmpeg tersedia di PATH (`ffmpeg -version`)
- Akun WhatsApp khusus bot/testing
- `yt-dlp` akan diunduh otomatis saat run pertama

## Instalasi

Pilih satu manajer paket (disarankan konsisten pakai yarn):

```bash
yarn install  # sudah dikonfigurasi pakai HTTPS untuk dependency libsignal
# atau
npm install
```

## Menjalankan

```bash
# (opsional) hapus sesi lama jika perlu
rm -rf auth_info_baileys

# start bot
yarn start
```

Flow saat start:
1. Tampilkan QR di terminal untuk pairing.
2. Setelah konek, bot menunggu 15 detik (sinkronisasi perangkat) baru mulai unduh & unggah status.
3. Interval pengecekan: 4 jam (`CHECK_INTERVAL_MS`).

## Konfigurasi Utama (index.js)

- `CHANNEL_URL` : URL channel YouTube.
- `MAX_VIDEO_CHECK` : jumlah video per batch (default 3).
- `CHECK_INTERVAL_MS` : interval loop (default 4 jam).
- `INITIAL_SYNC_DELAY_MS` : jeda setelah login sebelum proses pertama (default 15 detik).

## Pengujian

Jest unit test:
```bash
yarn test
```
Cakupan: builder argumen yt-dlp, filter video ytsr, jalur sukses/gagal download, upload status (mock).

## Masalah Diketahui

- Status tidak muncul di WA meski upload dipanggil. Perlu investigasi lebih lanjut pada Baileys/permission status.
- Hindari mencampur npm & yarn; lockfile yarn sudah disimpan.

## Lisensi

ISC
