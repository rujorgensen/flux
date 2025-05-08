import { describe, expect, it } from 'bun:test';
import { app } from './main';

describe('swagger', () => {

    it('should respond to pings', async () => {
        const response = await app
            .handle(new Request('http://localhost:3000/api/ping'))
            .then((res) => res.text());

        expect(response).toBe('pong');
    });

    it('should return docs', async () => {
        const response = await app
            .handle(new Request('http://localhost:3000/api/docs'))
            .then((res) => res.text());

        expect(response).toContain('Elysia Documentation');
    });
});