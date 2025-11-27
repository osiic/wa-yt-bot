const { buildYtDlpArgs } = require('../lib/yt');

describe('buildYtDlpArgs', () => {
    test('includes mandatory flags and output', () => {
        const args = buildYtDlpArgs('https://youtu.be/test', 'out.mp4');
        const joined = args.join(' ');

        expect(joined).toContain('--download-sections');
        expect(joined).toContain('*0:00:00-0:00:30');
        expect(joined).toContain('--force-keyframes-at-cuts');
        expect(joined).toContain('-o out.mp4');
    });
});
