const mockFs = {
    renameSync: jest.fn(),
};

const mockExec = jest.fn((cmd, opts, cb) => cb && cb(null, '', ''));

function mockYtDlp({ failExec = false, failVersion = false } = {}) {
    jest.doMock('yt-dlp-wrap', () => ({
        default: jest.fn().mockImplementation(() => ({
            getVersion: failVersion
                ? jest.fn().mockRejectedValue(new Error('ver-fail'))
                : jest.fn().mockResolvedValue('ver'),
            setBinaryPath: jest.fn(),
            execPromise: failExec
                ? jest.fn().mockRejectedValue(new Error('exec-fail'))
                : jest.fn().mockResolvedValue(),
        })),
    }));
}

function loadModule() {
    return require('../index');
}

describe('downloadAndConvertVideo', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.doMock('fs', () => mockFs);
        jest.doMock('child_process', () => ({ exec: mockExec }));
    });

    test('returns true on success path', async () => {
        mockYtDlp();
        const { downloadAndConvertVideo } = loadModule();
        const ok = await downloadAndConvertVideo('http://test', 'out.mp4');
        expect(ok).toBe(true);
    });

    test('returns false when yt-dlp fails', async () => {
        mockYtDlp({ failExec: true });
        const { downloadAndConvertVideo } = loadModule();
        const ok = await downloadAndConvertVideo('http://test', 'out.mp4');
        expect(ok).toBe(false);
    });
});
