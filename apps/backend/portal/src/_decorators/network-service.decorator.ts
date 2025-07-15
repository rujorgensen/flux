import Elysia from 'elysia';
import { NetworkRepository } from '../repository/network.repository';
import { getPortalPgRepository } from '../repository/prisma';

const networkRepository: NetworkRepository = new NetworkRepository(
    getPortalPgRepository(),
);

export const networkService = new Elysia()
    .decorate('networkService', {
        networkRepository,
    });