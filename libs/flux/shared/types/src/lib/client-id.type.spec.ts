import { nanoid } from 'nanoid';
import { isNanoId } from './client-id.type';

describe('validate client id (nanoid)', () => {
    it('should validate 10.000 nano ids', () => {
        for (let i = 0; i < 10_000; i++) {
            const id = nanoid();
            expect(isNanoId(id)).toBeTruthy();
        }
    });
}); 
