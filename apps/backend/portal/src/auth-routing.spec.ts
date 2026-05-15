import { describe, expect, it } from 'bun:test';
import { app } from './main';

describe('auth routing', () => {

    it('should let Better Auth handle session lookups', async () => {
        const response = await app.handle(new Request('http://localhost:3000/api/auth/get-session'));

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('application/json');
        expect(await response.text()).toBe('null');
    });
});
