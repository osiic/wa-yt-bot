jest.mock('ytsr');

const ytsr = require('ytsr');
const { getLatestVideos } = require('../index');

describe('getLatestVideos', () => {
    test('filters only video items and limits to MAX_VIDEO_CHECK', async () => {
        // channel lookup
        ytsr.mockImplementationOnce(() => ({ items: [{}] }));
        // search results
        ytsr.mockImplementationOnce(() => ({
            items: [
                { type: 'video', url: 'u1', title: 'v1' },
                { type: 'playlist', url: 'p1', title: 'p1' },
                { type: 'video', url: 'u2', title: 'v2' },
                { type: 'video', url: 'u3', title: 'v3' },
            ],
        }));

        const videos = await getLatestVideos();
        expect(videos).toEqual([
            { url: 'u1', title: 'v1' },
            { url: 'u2', title: 'v2' },
            { url: 'u3', title: 'v3' },
        ]);
    });

    test('returns empty array on failure', async () => {
        ytsr.mockRejectedValueOnce(new Error('net down'));
        const videos = await getLatestVideos();
        expect(videos).toEqual([]);
    });
});
