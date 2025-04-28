import { validateNetworkId } from './network.type';

describe('network-type', () => {
    it('should validate network ID with letters, numbers and dashes', () => {
        expect(validateNetworkId('rAnD0M-network-id')).toBeTruthy();
    });

    it('should not validate network ID with slashes', () => {
        expect(() => validateNetworkId('rAnD0M/network-id')).toThrowError('Network ID cannot contain /');
    });

    it('should not validate network ID with special characters', () => {
        expect(() => validateNetworkId('rAnD0M-&network-id')).toThrowError('Network ID can only contain letters, numbers and dashes (\'-\')');
        expect(() => validateNetworkId('#network-id')).toThrowError('Network ID can only contain letters, numbers and dashes (\'-\')');
        expect(() => validateNetworkId('etw+ork-id')).toThrowError('Network ID can only contain letters, numbers and dashes (\'-\')');
        expect(() => validateNetworkId('etwork$id')).toThrowError('Network ID can only contain letters, numbers and dashes (\'-\')');
    });
});