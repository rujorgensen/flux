import { describe, expect, it } from 'bun:test';
import type { TMessageCallback } from '@flux/shared/ws';
import { StateManager } from '@flux/shared/utils';
import { FluxWebSocketConnection } from './flux-ws-connection';

type TSocketStub = {
    clearEventSubscribers: () => void;
    connect: () => Promise<void>;
    close: () => void;
    on: (
        event: string,
        listener: (...args: unknown[]) => void,
    ) => TSocketStub;
};

const getSocketStub = (
    connection: FluxWebSocketConnection,
): TSocketStub => {
    return Reflect.get(connection, 'socket') as TSocketStub;
};

const getReadyInterceptors = (
    connection: FluxWebSocketConnection,
): Set<TMessageCallback> => {
    const interceptors = Reflect.get(connection, 'packageTypeInterceptorCallbacks') as Map<string, Set<TMessageCallback>>;

    return interceptors.get('isReady') ?? new Set();
};

const getReadyInterceptor = (
    connection: FluxWebSocketConnection,
): TMessageCallback => {
    const readyInterceptor = getReadyInterceptors(connection).values().next().value;

    if (!readyInterceptor) {
        throw new Error('Missing ready interceptor');
    }

    return readyInterceptor;
};

describe('FluxWebSocketConnection', () => {
    it('reuses the same pending connect promise and socket listeners', async () => {
        const connection = new FluxWebSocketConnection(
            'flux-instance',
            () => {},
            new StateManager(),
            'token',
            {
                domain: 'https://flux.test',
            },
        );
        const socket = getSocketStub(connection);

        let connectCalls = 0;
        const registeredListeners = new Map<string, Set<(...args: unknown[]) => void>>();

        socket.clearEventSubscribers = () => {
            registeredListeners.clear();
        };
        socket.on = (
            event: string,
            listener: (...args: unknown[]) => void,
        ) => {
            const eventListeners = registeredListeners.get(event) ?? new Set();

            eventListeners.add(listener);
            registeredListeners.set(event, eventListeners);

            return socket;
        };
        socket.connect = async () => {
            connectCalls++;
        };
        socket.close = () => {};

        const firstConnect = connection.connect();
        const secondConnect = connection.connect();

        expect(connectCalls).toBe(1);
        expect(registeredListeners.get('message')?.size).toBe(1);
        expect(registeredListeners.get('close')?.size).toBe(1);
        expect(registeredListeners.get('connecting')?.size).toBe(1);
        expect(registeredListeners.get('error')?.size).toBe(1);

        getReadyInterceptor(connection)('isReady');

        expect(firstConnect).resolves.toBe(socket);
        expect(secondConnect).resolves.toBe(socket);
    });

    it('keeps a single ready interceptor across reconnect cycles', async () => {
        let reconnectCalls = 0;

        const connection = new FluxWebSocketConnection(
            'flux-instance',
            () => {
                reconnectCalls++;
            },
            new StateManager(),
            'token',
            {
                domain: 'https://flux.test',
            },
        );
        const socket = getSocketStub(connection);
        const readyInterceptor = getReadyInterceptor(connection);

        socket.clearEventSubscribers = () => {};
        socket.on = () => socket;
        socket.connect = async () => {};
        socket.close = () => {};

        const firstConnect = connection.connect();

        readyInterceptor('isReady');
        await firstConnect;

        connection.disconnect();

        const secondConnect = connection.connect();

        expect(getReadyInterceptors(connection).size).toBe(1);

        readyInterceptor('isReady');
        await secondConnect;

        expect(reconnectCalls).toBe(1);
    });
});
