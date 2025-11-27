function buildYtDlpArgs(videoUrl, outputPath) {
    return [
        videoUrl,
        '--download-sections', '*0:00:00-0:00:30', // potong 0-30 detik
        '--force-keyframes-at-cuts',
        '-f', 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/bv*+ba/b',
        '--merge-output-format', 'mp4',
        '--format-sort', 'res:480,filesize',
        '--no-part',
        '--force-overwrites',
        '-o', outputPath,
    ];
}

module.exports = {
    buildYtDlpArgs,
};
