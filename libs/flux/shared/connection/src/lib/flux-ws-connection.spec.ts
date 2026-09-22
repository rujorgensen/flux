import { describe, expect, it } from 'bun:test';
import type { TMessageCallback } from '@flux/shared/ws';
import {
    NETWORK_CHANNEL_PUBLISH,
    ON_NETWORK_CHANNEL_PUBLISH,
    SUBSCRIBE_NETWORK_CHANNEL_NAME,
    SUBSCRIBED_NETWORK_CHANNEL_NAME,
    validateChannelNameOrThrow,
} from '@flux/shared/types';
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

type TStubbedSocket = {
    socket: TSocketStub & { send: (message: string) => void };
    sent: string[];
    listeners: Map<string, Set<(...args: unknown[]) => void>>;
};

// A socket that records sends and listeners instead of touching the network.
const stubSocket = (): TStubbedSocket => {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const sent: string[] = [];

    const socket: TSocketStub & { send: (message: string) => void } = {
        clearEventSubscribers: () => {
            listeners.clear();
        },
        connect: async () => {},
        close: () => {},
        on: (
            event: string,
            listener: (...args: unknown[]) => void,
        ) => {
            const eventListeners = listeners.get(event) ?? new Set();

            eventListeners.add(listener);
            listeners.set(event, eventListeners);

            return socket;
        },
        send: (message: string) => {
            sent.push(message);
        },
    };

    return { socket, sent, listeners };
};

// Delivers a message the way the low-level socket would: through the
// connection's message handler.
const deliver = (
    connection: FluxWebSocketConnection,
    stub: TStubbedSocket,
    message: string,
): void => {
    const messageListeners = stub.listeners.get('message');

    if (!messageListeners || messageListeners.size === 0) {
        throw new Error('No message listener on the socket');
    }

    for (const listener of messageListeners) {
        listener(message);
    }
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

    it('keeps re-scheduling sign-on with capped backoff when an attempt fails', async () => {
        // One shot per disconnect used to be the client's last (#516): if the
        // scheduled sign-on itself failed — laptop waking before its network,
        // mesh outage outlasting the inner retry budget — the catch only
        // logged and the client was permanently offline. A failed attempt must
        // schedule the next one; a successful one must schedule nothing.
        let signOns = 0;

        const connection = new FluxWebSocketConnection(
            'flux-instance',
            () => {
                signOns++;

                if (signOns < 3) {
                    return Promise.reject(new Error('mesh unreachable'));
                }

                return Promise.resolve();
            },
            new StateManager(),
            'token',
            {
                domain: 'https://flux.test',
            },
        );

        // Called directly with a tiny delay so the doubling retries stay
        // test-fast — the backoff logic is the same at any starting delay.
        (Reflect.get(connection, 'scheduleSignOn') as (delayMs: number) => void).call(connection, 10);

        await new Promise((resolve) => setTimeout(resolve, 250));

        // 10ms → fails → 20ms → fails → 40ms → succeeds. Well within the wait,
        // so a fourth attempt would have fired by now if success re-scheduled.
        expect(signOns).toBe(3);
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

    it('keeps channel handles and listeners working across a re-sign-on (#536)', async () => {
        // A sign-on used to build a whole new connection, whose empty channel
        // state left the old handles pointing at a dead socket: publish() was a
        // silent no-op and onPublish listeners never fired again. Reconnect()
        // must keep the object and only swap the socket underneath it.
        const connection = new FluxWebSocketConnection(
            'flux-instance',
            () => {},
            new StateManager(),
            'token',
            {
                domain: 'https://flux.test',
            },
        );

        const firstStub = stubSocket();
        // The constructor built a real socket before the stub existed — swap it
        // out, and serve the re-sign-on's fresh socket from the stub too.
        Reflect.set(connection, 'socket', firstStub.socket);
        Reflect.set(connection, 'createSocket', () => firstStub.socket);

        const firstConnect = connection.connect();
        getReadyInterceptor(connection)('isReady');
        await firstConnect;

        const channelName = 't';

        if (!validateChannelNameOrThrow(channelName)) {
            throw new Error('Will never be thrown');
        }

        const channelPromise = connection.joinChannel(channelName);

        // The ack the mesh sends for that subscription — through the connection's
        // message handler, like every other socket message.
        deliver(connection, firstStub, `${SUBSCRIBED_NETWORK_CHANNEL_NAME}:t`);

        const channel = await channelPromise;

        expect(firstStub.sent).toContain(`${SUBSCRIBE_NETWORK_CHANNEL_NAME}:t`);

        const received: string[] = [];
        channel.onPublish<string>((message: string) => {
            received.push(message);
        });

        // A re-sign-on: fresh ticket, fresh socket, same connection object.
        const secondStub = stubSocket();
        Reflect.set(connection, 'createSocket', () => secondStub.socket);

        connection.reconnect('token-2');
        const connectPromise = connection.connect();
        getReadyInterceptor(connection)('isReady');
        // Identity, not truthiness: the promise must resolve to the NEW socket.
        expect((await connectPromise) === secondStub.socket).toBe(true);

        // The new socket starts with a blank registry on the mesh — every joined
        // channel is subscribed again once the socket is ready.
        expect(secondStub.sent).toContain(`${SUBSCRIBE_NETWORK_CHANNEL_NAME}:t`);

        // The handle still publishes, over the new socket.
        channel.publish('after-reconnect');
        expect(secondStub.sent).toContain(`${NETWORK_CHANNEL_PUBLISH}:t:s:after-reconnect`);

        // The listener still receives, from the new socket.
        deliver(connection, secondStub, `${ON_NETWORK_CHANNEL_PUBLISH}:some-agent:t:s:hello-again`);
        expect(received).toEqual(['hello-again']);
    });

    it('warns instead of silently dropping a publish while disconnected', () => {
        const connection = new FluxWebSocketConnection(
            'flux-instance',
            () => {},
            new StateManager(),
            'token',
            {
                domain: 'https://flux.test',
            },
        );

        const warnings: unknown[][] = [];
        const originalWarn = console.warn;

        console.warn = (...args: unknown[]) => {
            warnings.push(args);
        };

        try {
            const channelName = 't';

            if (!validateChannelNameOrThrow(channelName)) {
                throw new Error('Will never be thrown');
            }

            connection.publish(channelName, 'lost');
        } finally {
            console.warn = originalWarn;
        }

        expect(warnings.length).toBe(1);
        expect(String(warnings[0][0])).toContain('t');
    });
});
