import { describe, expect, it } from 'bun:test';
import { app } from './main';

describe('swagger', () => {

    /**
     * Tests that the API responds to ping requests
     */
    it('should respond to pings', async () => {
        const response = await app
            .handle(new Request('http://localhost:3000/api/ping'))
            .then((res) => res.text());

        expect(response).toBe('pong');
    });

    /**
     * Tests that the API documentation endpoint returns the Elysia documentation
     */
    it('should return docs', async () => {
        const response = await app
            .handle(new Request('http://localhost:3000/api/docs'))
            .then((res) => res.text());

        expect(response).toContain('Elysia Documentation');
    });
});