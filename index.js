const baileys = require('@whiskeysockets/baileys');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
const fs = require('fs');
const { exec } = require('child_process');
const ytsr = require('ytsr');
const YTDlpWrap = require('yt-dlp-wrap').default;
const qrcode = require('qrcode-terminal');
const { buildYtDlpArgs } = require('./lib/yt');

// =================================================================
// KONFIGURASI BOT
// =================================================================
const CHANNEL_URL = 'https://www.youtube.com/@motivationalresource';
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 jam dalam milidetik
const AUTH_FILE_PATH = 'auth_info_baileys'; // Folder untuk menyimpan sesi WA
const MAX_VIDEO_CHECK = 3; // <-- JUMLAH VIDEO APAPUN YANG AKAN DIAMBIL
const YT_DLP_BIN_PATH = `./yt-dlp${process.platform === 'win32' ? '.exe' : ''}`; // Biner yt-dlp sesuai OS
const INITIAL_SYNC_DELAY_MS = 15_000; // jeda awal setelah login untuk pastikan link perangkat

// yt-dlp wrapper (lebih stabil menghadapi perubahan cipher YouTube dibanding ytdl-core)
const ytdlp = new YTDlpWrap(YT_DLP_BIN_PATH);

async function ensureYtDlpBinary() {
    try {
        await ytdlp.getVersion();
        return; // biner sudah siap
    } catch (err) {
        console.log('[DOWNLOAD] Mengunduh yt-dlp terbaru (sekali saja)...');
        await YTDlpWrap.downloadFromGithub(YT_DLP_BIN_PATH);
        ytdlp.setBinaryPath(YT_DLP_BIN_PATH);
        console.log('[DOWNLOAD] yt-dlp siap digunakan.');
    }
}

function compressVideo(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const ffmpegCmd = [
            'ffmpeg',
            '-y',
            `-i "${inputPath}"`,
            '-vf "scale=720:-2"',
            '-c:v libx264 -preset veryfast -profile:v main -level 3.1 -pix_fmt yuv420p',
            '-crf 28',
            '-c:a aac -b:a 96k',
            '-movflags +faststart',
            `"${outputPath}"`
        ].join(' ');

        exec(ffmpegCmd, { maxBuffer: 1024 * 1024 * 50 }, (error, _stdout, stderr) => {
            if (error) {
                console.error('[DOWNLOAD] Kompresi gagal:', stderr);
                return reject(error);
            }
            resolve(true);
        });
    });
}

// =================================================================
// 1. FUNGSI PENCARIAN VIDEO TERBARU
// =================================================================

/**
 * Mengambil URL MAX_VIDEO_CHECK video terbaru (apapun, bukan hanya Short) dari channel YouTube.
 * @returns {Promise<Array<Object>>} Daftar {url, title} video terbaru.
 */
async function getLatestVideos() { // Nama fungsi diubah
    console.log(`[YOUTUBE] Mencari ${MAX_VIDEO_CHECK} video terbaru...`);
    try {
        const channelResult = await ytsr(CHANNEL_URL, { limit: 1, type: 'channel' });
        if (!channelResult || !channelResult.items || channelResult.items.length === 0) {
            console.error('[YOUTUBE] Channel tidak ditemukan atau masalah koneksi.');
            return [];
        }

        // Mencari video dari URL channel utama (bukan tab /shorts)
        const searchResults = await ytsr(CHANNEL_URL, { limit: MAX_VIDEO_CHECK });
        
        if (!searchResults || searchResults.items.length === 0) {
            console.log('[YOUTUBE] Tidak ada video ditemukan.');
            return [];
        }

        // Filter: hanya ambil item yang bertipe 'video' (mengabaikan playlist, channel, atau filter lain)
        const latestVideos = searchResults.items
            .filter(item => item.type === 'video')
            .slice(0, MAX_VIDEO_CHECK) // Ambil hanya 3 teratas
            .map(item => ({ url: item.url, title: item.title }));

        console.log(`[YOUTUBE] Ditemukan ${latestVideos.length} video utama.`);
        return latestVideos;

    } catch (error) {
        console.error('[YOUTUBE] Error saat mencari video:', error);
        return [];
    }
}

// =================================================================
// 2. FUNGSI DOWNLOAD VIDEO (TETAP MENGANDUNG POTONGAN 30 DETIK)
// =================================================================

/**
 * Mendownload dan mengkonversi video, DENGAN MEMOTONGNYA menjadi 30 detik.
 * CATATAN: Membutuhkan FFmpeg terinstal di sistem WSL/Linux.
 */
async function downloadAndConvertVideo(videoUrl, outputPath) {
    console.log(`[DOWNLOAD] Memulai download dan konversi (Potong 30s): ${videoUrl}`);

    try {
        await ensureYtDlpBinary();

        const args = buildYtDlpArgs(videoUrl, outputPath);
        await ytdlp.execPromise(args, { maxBuffer: 1024 * 1024 * 50 });

        const compressedPath = outputPath.replace('.mp4', '_compressed.mp4');
        await compressVideo(outputPath, compressedPath);
        fs.renameSync(compressedPath, outputPath);

        console.log(`[DOWNLOAD] Konversi selesai. File tersimpan di: ${outputPath}`);
        return true;
    } catch (error) {
        console.error(`[DOWNLOAD] yt-dlp/FFmpeg Error: ${error.message || error}`);
        return false;
    }
}

// =================================================================
// 3. FUNGSI UPLOAD STATUS WA (TETAP SAMA)
// =================================================================

/**
 * Mengunggah video yang telah didownload ke WhatsApp Status.
 */
async function uploadVideoStatus(sock, videoPath, caption) {
    if (!fs.existsSync(videoPath)) {
        console.error(`[WA] File video tidak ditemukan di: ${videoPath}`);
        return;
    }

    console.log('[WA] Mengunggah Status Video...');
    const statusJid = 'status@broadcast';

    try {
        const sendResult = await sock.sendMessage(
            statusJid,
            {
                video: { url: videoPath },
                caption: caption,
                mimetype: 'video/mp4',
                fileName: 'status.mp4',
            },
            { mediaUploadTimeoutMs: 120000 }
        );

        console.log('[WA] Status Video berhasil diunggah!', sendResult?.key?.id || '');
        fs.unlinkSync(videoPath);
        console.log(`[FILE] File ${videoPath} telah dihapus.`);

    } catch (error) {
        console.error('[WA] Gagal mengunggah Status Video:', error);
    }
}

// =================================================================
// 4. ALGORITMA BOT UTAMA
// =================================================================

async function botAlgorithm(sock) {
    console.log(`\n--- [CEK BARU] ${new Date().toLocaleTimeString()} ---`);

    const latestVideos = await getLatestVideos(); // Menggunakan fungsi baru
    if (latestVideos.length === 0) {
        console.log('[STATUS] Tidak ada video ditemukan. Menunggu 4 jam lagi.');
        return;
    }

    // Proses video dari yang tertua ke terbaru untuk urutan upload WA yang benar
    for (const video of latestVideos.reverse()) {
        console.log(`[STATUS] Memulai proses Video: ${video.title} (Repost 30s)`);
        
        const outputFileName = `status_${Date.now()}.mp4`;
        const downloadSuccess = await downloadAndConvertVideo(video.url, outputFileName);

        if (downloadSuccess) {
            const captionText = `Potongan 30 detik Video Terbaru dari Motivational Resource: ${video.title} | Link: ${video.url}`;
            await uploadVideoStatus(sock, outputFileName, captionText);
            
            // Jeda antar upload
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log(`--- [CEK SELESAI] Semua ${MAX_VIDEO_CHECK} video terbaru sudah diproses dan diunggah. ---`);
}

// =================================================================
// 5. KONEKSI UTAMA WA DAN SCHEDULER
// =================================================================

async function connectToWhatsApp() {
    console.log('[WA] Memulai koneksi WhatsApp...');
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FILE_PATH);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: true,
        browser: ['Chrome (Linux)', '1.0.0', 'Linux']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[WA] Koneksi terputus.', shouldReconnect ? 'Mencoba menyambung ulang...' : 'Harus login ulang.');
            if (shouldReconnect) {
                connectToWhatsApp(); 
            } else {
                console.log('Silakan hapus folder "auth_info_baileys" dan jalankan ulang bot.');
            }
        } else if (connection === 'open') {
            console.log('[WA] Koneksi berhasil! Bot siap beroperasi.');

            console.log(`[WA] Menunggu ${INITIAL_SYNC_DELAY_MS / 1000}s untuk sinkronisasi perangkat...`);
            // beri jeda agar initial sync & link device benar-benar selesai
            setTimeout(() => botAlgorithm(sock), INITIAL_SYNC_DELAY_MS);
            setInterval(() => botAlgorithm(sock), CHECK_INTERVAL_MS);
        }

        if (qr) {
            console.log('[WA] Pindai QR Code berikut untuk login:');
            qrcode.generate(qr, { small: true }); 
            console.log('--- END QR CODE ---');
        }
    });

    sock.ev.on('contacts.upsert', (contacts) => {
        contacts.forEach(contact => {
            sock.contacts = sock.contacts || {};
            sock.contacts[contact.id] = contact;
        });
    });

    sock.ev.on('creds.update', saveCreds);
}

if (require.main === module) {
    connectToWhatsApp().catch(err => console.error('Error Fatal Bot:', err));
}

module.exports = {
    buildYtDlpArgs,
    getLatestVideos,
    downloadAndConvertVideo,
    uploadVideoStatus,
    ensureYtDlpBinary,
    compressVideo,
};
