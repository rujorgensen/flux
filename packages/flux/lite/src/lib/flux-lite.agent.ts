/*
 * A Flux Agent in plain functions and closures: no classes, no async, no Map. See ../../README.md for the scope.
 */
import type { IFluxLiteAgent, IFluxLiteHandlers, IFluxLiteOptions, IFluxLiteSocket, TFluxLiteState } from './flux-lite.interfaces';
import { authUrl, encodePayload, parseFrame, socketUrl, type TFluxLiteFrame } from './flux-lite.utils';

// The mesh tickets expire; a sign-on is cheap, so every drop signs on again from the start
const RECONNECT_MS: number = 2_000;
const MAX_RETRY_MS: number = 30_000; // backoff ceiling, as in @persistica/flux-agent
// Each tick sends a ping and joins again any channel without an ack (e.g. one the Authority refused until now)
const TICK_MS: number = 25_000;
// The time from the socket open to 'isReady'. A hung handshake left the agent in 'connecting' for ever.
const READY_TIMEOUT_MS: number = 20_000;
// The mesh closes a kicked agent's socket with this reason. As RECONNECTION_DELAY_ON_KICK_MS in the official client.
const KICK_REASON: string = 'Kicked by process';
const KICK_DELAY_MS: number = 1_800_000; // 30 minutes

const AUTH_HEADERS: Record<string, string> = {
	'Content-Type': 'text/plain',
	'x-flux-content-type': 'text/plain',
	'Accept': 'text/plain',
};

export const createFluxLiteAgent = (
	o: IFluxLiteOptions,
	h: IFluxLiteHandlers,
): IFluxLiteAgent => {
	const joined: Record<string, boolean | undefined> = {}; // every wanted channel → the mesh acknowledged it on this socket
	let socket: IFluxLiteSocket | null = null;
	let ready: boolean = false;
	let generation: number = 0; // events from an old socket carry an old number and are ignored
	let failures: number = 0;
	let stopped: boolean = false;
	let signOnTimer: any = null;
	let tickTimer: any = null;
	let awaitingPong: boolean = false;
	let pongSeen: boolean = false; // a mesh that never answers a ping is older than the heartbeat: no dead-socket check

	const setState = (
		state: TFluxLiteState,
		detail: string | null,
	): void => h.state(state, detail);

	const send = (
		text: string,
	): void => {
		if (socket && ready) {
			try {
				socket.send(text);
			} catch {
				// Espruino throws "This socket is closed" when WiFi drops before the close event: count it as that drop
				dropped('');
			}
		}
	};

	const joinMissing = (
	): void => {
		Object.keys(joined).forEach((channel: string): void => {
			if (!joined[channel]) {
				send(`subscribe-to-nc-name:${channel}`);
			}
		});
	};

	const signOnLater = (
		ms: number,
	): void => {
		if (stopped) {
			return;
		}
		clearTimeout(signOnTimer);
		signOnTimer = setTimeout(signOn, ms);
	};

	const fail = (
		detail: string,
	): void => {
		failures++;
		setState('auth-error', detail);
		signOnLater(Math.min(MAX_RETRY_MS, RECONNECT_MS * Math.pow(2, failures - 1)));
	};

	const dropped = (
		reason: string,
	): void => {
		const wasReady: boolean = ready;
		generation++;
		socket = null;
		ready = false;
		clearTimeout(tickTimer);
		tickTimer = null;
		Object.keys(joined).forEach((channel: string): void => {
			joined[channel] = false;
		});
		if (stopped) {
			return;
		}
		if (reason === KICK_REASON) {
			setState('disconnected', 'kicked');
			signOnLater(KICK_DELAY_MS);
		} else if (wasReady) {
			setState('disconnected', null);
			signOnLater(RECONNECT_MS);
		} else {
			fail(reason ? `socket closed before the mesh was ready: ${reason}` : 'socket closed before the mesh was ready');
		}
	};

	// Drop first, so the close event that close() may fire comes from an old socket and is ignored
	const kill = (
		reason: string,
	): void => {
		const dead: IFluxLiteSocket | null = socket;
		dropped(reason);
		if (dead) {
			dead.close();
		}
	};

	const tick = (
	): void => {
		if (awaitingPong && pongSeen) {
			// The mesh answered pings before and stopped: the socket is dead without a close event
			kill('');

			return;
		}
		if (!awaitingPong || !pongSeen) {
			awaitingPong = true;
			send('hb-ping');
		}
		joinMissing();
		tickTimer = setTimeout(tick, TICK_MS);
	};

	const onFrame = (
		frame: TFluxLiteFrame,
	): void => {
		switch (frame.kind) {
			case 'ready':
				clearTimeout(tickTimer); // the ready timeout
				ready = true;
				failures = 0;
				awaitingPong = false;
				pongSeen = false;
				setState('connected', null);
				joinMissing();
				// A setTimeout chain, not setInterval: on Espruino an interval fires again and again to catch up after the
				// SNTP clock jump, and keeps the device busy (probe display, 2026-11-18)
				tickTimer = setTimeout(tick, TICK_MS);
				break;
			case 'pong':
				awaitingPong = false;
				pongSeen = true;
				break;
			case 'joined':
				if (joined[frame.channel] !== undefined) {
					joined[frame.channel] = true;
				}
				break;
			case 'publish':
				h.message(frame.channel, frame.data);
				break;
			case 'error':
				h.error(frame.message);
				break;
			default:
				// 'left', and RPC requests (WebRTC peering), which flux-lite does not offer
				break;
		}
	};

	const connect = (
		ticket: string,
	): void => {
		setState('connecting', null);
		const mine: number = ++generation;
		// tickTimer is free until 'isReady'. Set before open(), so a close inside open() clears it in dropped().
		tickTimer = setTimeout((): void => kill('no isReady in 20 s'), READY_TIMEOUT_MS);
		socket = o.transport.open(socketUrl(o.domain, ticket), {
			open: (): void => {},
			message: (text: string): void => {
				if (mine === generation) {
					onFrame(parseFrame(text));
				}
			},
			close: (reason: string): void => {
				if (mine === generation) {
					dropped(reason);
				}
			},
		});
	};

	function signOn(
	): void {
		signOnTimer = null;
		setState('authorizing', null);
		o.transport.post(authUrl(o.domain, o.networkId, o.agentUid), o.claim, AUTH_HEADERS, (status: number, body: string): void => {
			if (stopped) {
				return;
			}
			if (status === 200) {
				connect(body);
			} else {
				// 401 covers both a refused claim and "no Authority online yet": both can change, so both retry
				fail(status === 0 ? `no answer: ${body}` : `${status} ${body}`);
			}
		});
	}

	signOn();

	return {
		join: (channel: string): void => {
			if (joined[channel] === undefined) {
				joined[channel] = false;
				send(`subscribe-to-nc-name:${channel}`);
			}
		},
		leave: (channel: string): void => {
			if (joined[channel] !== undefined) {
				delete joined[channel];
				send(`unsubscribe-nc-name:${channel}`);
			}
		},
		// Dropped while the socket is down: delivery is at-most-once, as in @persistica/flux-agent
		publish: (channel: string, data: unknown): void => send(`nc-pub:${channel}:${encodePayload(data)}`),
		stop: (): void => {
			stopped = true;
			clearTimeout(signOnTimer);
			kill('');
		},
	};
};
