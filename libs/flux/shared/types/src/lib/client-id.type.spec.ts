import { nanoid } from 'nanoid';
import { isNanoId, NANOID_LENGTH } from './client-id.type';

describe('validate client id (nanoid)', () => {
    it('should validate 10.000 nano ids', () => {
        for (let i = 0; i < 10_000; i++) {
            const id = nanoid();
            expect(isNanoId(id)).toBeTruthy();
        }
    });

    it('should not validate an id containing /', () => {
        expect(isNanoId('invalid/id')).toBeFalsy();
    });

    it('returns true for a valid nanoid', () => {
        const id = nanoid(NANOID_LENGTH);
        expect(isNanoId(id)).toBe(true);
    });

    it('returns false for a string containing "/"', () => {
        const invalidId = 'abc/def';
        expect(isNanoId(invalidId)).toBe(false);
    });

    it('returns false for a string with invalid characters', () => {
        const invalidId = 'abc!def';
        expect(isNanoId(invalidId)).toBe(false);
    });

    it('returns false for a string of incorrect length', () => {
        const invalidId = nanoid(NANOID_LENGTH + 1);
        expect(isNanoId(invalidId)).toBe(false);
    });

    it('returns false for non-string values', () => {
        expect(isNanoId(123)).toBe(false);
        expect(isNanoId(null)).toBe(false);
        expect(isNanoId(undefined)).toBe(false);
    });
});