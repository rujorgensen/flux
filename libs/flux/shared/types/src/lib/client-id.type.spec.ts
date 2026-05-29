import { nanoid } from 'nanoid';
import { isClientId, NANOID_LENGTH } from './client-id.type';

describe('validate client id (nanoid)', () => {
    it('should validate 10.000 nano ids', () => {
        for (let i = 0; i < 10_000; i++) {
            const id = nanoid();
            expect(isClientId(id)).toBeTruthy();
        }
    });

    it('should not validate an id containing /', () => {
        expect(isClientId('invalid/id')).toBeFalsy();
    });

    it('returns true for a valid nanoid', () => {
        const id = nanoid(NANOID_LENGTH);
        expect(isClientId(id)).toBe(true);
    });

    it('returns false for a string containing "/"', () => {
        const invalidId = 'abc/def';
        expect(isClientId(invalidId)).toBe(false);
    });

    it('returns false for a string with invalid characters', () => {
        const invalidId = 'abc!def';
        expect(isClientId(invalidId)).toBe(false);
    });

    it('returns false for a string of incorrect length', () => {
        const invalidId = nanoid(NANOID_LENGTH + 1);
        expect(isClientId(invalidId)).toBe(false);
    });

    it('returns false for non-string values', () => {
        expect(isClientId(123)).toBe(false);
        expect(isClientId(null)).toBe(false);
        expect(isClientId(undefined)).toBe(false);
    });
});