const fs = require('fs');
jest.mock('fs');

const { uploadVideoStatus } = require('../index');

describe('uploadVideoStatus', () => {
    test('skips when file missing', async () => {
        fs.existsSync.mockReturnValue(false);
        const sock = { sendMessage: jest.fn() };
        await uploadVideoStatus(sock, 'x.mp4', 'caption');
        expect(sock.sendMessage).not.toHaveBeenCalled();
    });

    test('uploads when file exists', async () => {
        fs.existsSync.mockReturnValue(true);
        fs.unlinkSync.mockImplementation(() => {});
        fs.readFileSync.mockReturnValue(Buffer.from('vid'));
        const sock = { sendMessage: jest.fn().mockResolvedValue({ key: { id: '123' } }) };
        await uploadVideoStatus(sock, 'x.mp4', 'caption');
        expect(sock.sendMessage).toHaveBeenCalledWith(
            'status@broadcast',
            {
                video: { url: 'x.mp4' },
                caption: 'caption',
                mimetype: 'video/mp4',
                fileName: 'status.mp4',
            },
            { mediaUploadTimeoutMs: 120000 }
        );
    });
});
