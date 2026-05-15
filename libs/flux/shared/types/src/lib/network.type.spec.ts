import { validateNetworkIdOrThrow } from './network.type';

describe('network-type', () => {
    it('should validate network ID with letters, numbers and dashes', () => {
        expect(validateNetworkIdOrThrow('rAnD0M-network-id')).toBeTruthy();
    });

    it('should not validate network ID with slashes', () => {
        expect(() => validateNetworkIdOrThrow('rAnD0M/network-id')).toThrowError('Network ID cannot contain /');
    });

    it('should not validate network ID with special characters', () => {
        expect(() => validateNetworkIdOrThrow('rAnD0M-&network-id')).toThrowError('Network ID can only contain letters, numbers and dashes (\'-\')');
        expect(() => validateNetworkIdOrThrow('#network-id')).toThrowError('Network ID can only contain letters, numbers and dashes (\'-\')');
        expect(() => validateNetworkIdOrThrow('etw+ork-id')).toThrowError('Network ID can only contain letters, numbers and dashes (\'-\')');
        expect(() => validateNetworkIdOrThrow('etwork$id')).toThrowError('Network ID can only contain letters, numbers and dashes (\'-\')');
    });
});