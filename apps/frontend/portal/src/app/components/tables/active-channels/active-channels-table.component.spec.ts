import { describe, expect, it } from 'vitest';
import {
    deriveChannelFillPercent,
    MAX_CHANNEL_MEMBERS,
} from './channel-capacity.utils';

describe('deriveChannelFillPercent', () => {
    it('should return 0 for empty channels', () => {
        expect(deriveChannelFillPercent(0)).toBe(0);
    });

    it('should calculate percentage for partially full channels', () => {
        expect(deriveChannelFillPercent(500_000)).toBe(50);
        expect(deriveChannelFillPercent(250_000)).toBe(25);
    });

    it('should clamp to 100 for full and overfull channels', () => {
        expect(deriveChannelFillPercent(MAX_CHANNEL_MEMBERS)).toBe(100);
        expect(deriveChannelFillPercent(MAX_CHANNEL_MEMBERS + 1)).toBe(100);
    });
});
