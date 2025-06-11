import { describe, expect, it } from 'bun:test';
import { app } from './main';

describe('Network Routes Pagination API Schema', () => {
    const networkId = 'test-network-123';

    describe('Query parameter validation', () => {
        it('should reject invalid page parameter (less than 1)', async () => {
            const response = await app
                .handle(new Request(`http://localhost:3000/api/networks/${networkId}/agents/connected?page=0`));
            
            expect(response.status).toBe(422); // Validation error
        });

        it('should reject pageSize exceeding maximum (greater than 100)', async () => {
            const response = await app
                .handle(new Request(`http://localhost:3000/api/networks/${networkId}/agents/connected?pageSize=101`));
            
            expect(response.status).toBe(422); // Validation error
        });

        it('should reject negative pageSize', async () => {
            const response = await app
                .handle(new Request(`http://localhost:3000/api/networks/${networkId}/channels?pageSize=-1`));
            
            expect(response.status).toBe(422); // Validation error
        });

        it('should accept valid pagination parameters', async () => {
            // This test validates that the schema accepts valid parameters
            // Note: Will return 500 in test environment due to Redis connection
            const response = await app
                .handle(new Request(`http://localhost:3000/api/networks/${networkId}/agents/connected?page=2&pageSize=10`));
            
            // In test environment without Redis, we expect connection errors, not validation errors
            expect(response.status).not.toBe(422);
        });
    });
});