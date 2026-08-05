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

// Mirrors RECONNECT_DELAY_MS in the implementation.
const RECONNECT_DELAY_MS: number = 2_000;

const getCloseHandler = (
    connection: FluxWebSocketConnection,
): ((reason?: 'kicked') => void) => {
    return Reflect.get(connection, 'socketCloseHandler') as (reason?: 'kicked') => void;
};

const getConnectFailedHandler = (
    connection: FluxWebSocketConnection,
): (() => void) => {
    return Reflect.get(connection, 'socketConnectFailedHandler') as () => void;
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
    });

    it('signs on again when the socket closes', async () => {
        // The ticket in the socket URL expires long before the connection does, so
        // a dropped socket can only come back through a fresh sign-on — and it has
        // to be the disconnect that starts it. Hanging this off a successful
        // reconnect (the old ready-interceptor path) means an expired ticket never
        // reaches it: the mesh rejects every re-dial with 'jwt expired' (#497).
        let signOns = 0;

        const connection = new FluxWebSocketConnection(
            'flux-instance',
            () => {
                signOns++;
            },
            new StateManager(),
            'token',
            {
                domain: 'https://flux.test',
            },
        );
        const socket = getSocketStub(connection);

        socket.clearEventSubscribers = () => {};
        socket.on = () => socket;
        socket.connect = async () => {};
        socket.close = () => {};

        getCloseHandler(connection)();

        expect(signOns).toBe(0); // Not synchronously — the mesh gets breathing room first.

        await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS + 250));

        expect(signOns).toBe(1);
    });

    it('signs on again when the socket dies before it opens', async () => {
        // The pre-open sibling of the case above (#508): a socket that never opens
        // emits no 'close', so nothing signed on again and the Authority stayed up,
        // silent and unregistered, until someone restarted it.
        let signOns = 0;

        const connection = new FluxWebSocketConnection(
            'flux-instance',
            () => {
                signOns++;
            },
            new StateManager(),
            'token',
            {
                domain: 'https://flux.test',
            },
        );
        const socket = getSocketStub(connection);

        socket.clearEventSubscribers = () => {};
        socket.on = () => socket;
        socket.connect = async () => {};
        socket.close = () => {};

        getConnectFailedHandler(connection)();

        expect(signOns).toBe(0); // Not synchronously — the mesh gets breathing room first.

        await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS + 250));

        expect(signOns).toBe(1);
    });

    it('drops the unsettleable connect promise when the socket dies before it opens', async () => {
        // Nothing can resolve a `connect()` awaiting a socket that never opened — a
        // later call has to dial a fresh one instead of joining that dead promise.
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

        socket.clearEventSubscribers = () => {};
        socket.on = () => socket;
        socket.connect = async () => {
            connectCalls++;
        };
        socket.close = () => {};

        void connection.connect();

        expect(connectCalls).toBe(1);

        getConnectFailedHandler(connection)();

        const secondConnect = connection.connect();

        expect(connectCalls).toBe(2);

        getReadyInterceptor(connection)('isReady');

        await secondConnect;
    });

    it('does not sign on again after the socket auto-reconnects on its own', () => {
        // Auto-reconnect is off precisely because it would re-dial the expired
        // ticket. If it is ever turned back on, the sign-on path double-connects.
        const connection = new FluxWebSocketConnection(
            'flux-instance',
            () => {},
            new StateManager(),
            'token',
            {
                domain: 'https://flux.test',
            },
        );

        const socketOptions = Reflect.get(getSocketStub(connection), 'options') as { autoReconnect?: boolean; };

        expect(socketOptions.autoReconnect).toBe(false);
    });
});
