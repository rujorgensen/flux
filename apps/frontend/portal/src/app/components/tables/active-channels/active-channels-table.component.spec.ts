import { describe, expect, it } from 'vitest';
import {
    deriveChannelFillPercent,
} from './channel-capacity.utils';
import {
    MAX_CHANNEL_MEMBERS,
} from '@flux/shared/features/channels';

describe('deriveChannelFillPercent', () => {
    it('should return 0 for empty channels', () => {
        expect(deriveChannelFillPercent('medium', 0)).toBe(0);
    });

    it('should calculate percentage for partially full channels', () => {
        expect(deriveChannelFillPercent('medium', 250)).toBe(50);
        expect(deriveChannelFillPercent('medium', 175)).toBe(35);
    });

    it('should clamp to 100 for full and overfull channels', () => {
        expect(deriveChannelFillPercent('medium', MAX_CHANNEL_MEMBERS)).toBe(100);
        expect(deriveChannelFillPercent('medium', MAX_CHANNEL_MEMBERS + 1)).toBe(100);
    });
});
