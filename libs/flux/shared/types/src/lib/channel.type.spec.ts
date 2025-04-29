import { validateChannelNameOrThrow } from './channel.type';

describe('channel-type', () => {
    it('should validate channel ID with letters, numbers and dashes', () => {
        expect(validateChannelNameOrThrow('rAnD0M-network-id')).toBeTruthy();
    });

    it('should not validate channel ID with slashes', () => {
        expect(() => validateChannelNameOrThrow('rAnD0M/network-id')).toThrowError('Channel name cannot contain /');
    });

    it('should not validate channel ID with special characters', () => {
        expect(() => validateChannelNameOrThrow('rAnD0M-&network-id')).toThrowError('Channel name can only contain letters, numbers and dashes (\'-\')');
        expect(() => validateChannelNameOrThrow('#network-id')).toThrowError('Channel name can only contain letters, numbers and dashes (\'-\')');
        expect(() => validateChannelNameOrThrow('etw+ork-id')).toThrowError('Channel name can only contain letters, numbers and dashes (\'-\')');
        expect(() => validateChannelNameOrThrow('etwork$id')).toThrowError('Channel name can only contain letters, numbers and dashes (\'-\')');
    });
});