import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test';
import { createFluxLiteAgent } from './flux-lite.agent';
import type { IFluxLiteAgent, IFluxLiteSocketEvents, IFluxLiteTransport } from './flux-lite.interfaces';

interface IFake {
	transport: IFluxLiteTransport;
	posts: string[];
	answerPost: (status: number, body: string) => void;
	events: () => IFluxLiteSocketEvents;
	sent: string[];
	urls: string[];
	closed: number;
}

const fake = (
): IFake => {
	let pending: ((status: number, body: string) => void) | null = null;
	let events: IFluxLiteSocketEvents | null = null;
	const f: IFake = {
		posts: [],
		sent: [],
		urls: [],
		closed: 0,
		answerPost: (status: number, body: string): void => pending!(status, body),
		events: (): IFluxLiteSocketEvents => events!,
		transport: {
			post: (url: string, body: string, _headers: Record<string, string>, done: (status: number, body: string) => void): void => {
				f.posts.push(`${url} ${body}`);
				pending = done;
			},
			open: (url: string, e: IFluxLiteSocketEvents) => {
				f.urls.push(url);
				events = e;

				return { send: (text: string): number => f.sent.push(text), close: (): number => f.closed++ };
			},
		},
	};

	return f;
};

describe('createFluxLiteAgent', () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	test('signs on, joins, receives, and signs on again after a drop', () => {
		const f: IFake = fake();
		const states: string[] = [];
		const received: unknown[] = [];
		const agent: IFluxLiteAgent = createFluxLiteAgent(
			{ domain: 'https://mesh.test', networkId: 'net', claim: 'dev-1', agentUid: 'dev-1', transport: f.transport },
			{ state: (s: string): number => states.push(s), message: (c: string, d: unknown): number => received.push([c, d]), error: (): void => {} },
		);
		agent.join('sensor-1');

		expect(f.posts).toEqual(['https://mesh.test/auth/network-client?networkId=net&requestedAgentUid=dev-1 dev-1']);
		f.answerPost(200, 'ticket-1');
		expect(f.urls).toEqual(['wss://mesh.test/?token=ticket-1']);
		expect(f.sent).toEqual([]); // nothing before the mesh says it is ready

		f.events().message('isReady');
		expect(f.sent).toEqual(['subscribe-to-nc-name:sensor-1']);
		f.events().message('subscribed-to-nc-name:sensor-1');
		f.events().message('nc-on-pub:server:sensor-1:o:{"m":[7.1]}');
		expect(received).toEqual([['sensor-1', { m: [7.1] }]]);

		// A dropped socket signs on again after 2 s, with a new ticket, and joins the channel again
		f.events().close('');
		expect(states.slice(-1)).toEqual(['disconnected']);
		jest.advanceTimersByTime(2_000);
		f.answerPost(200, 'ticket-2');
		f.events().message('isReady');
		expect(f.sent.slice(-1)).toEqual(['subscribe-to-nc-name:sensor-1']);
		expect(states).toEqual(['authorizing', 'connecting', 'connected', 'disconnected', 'authorizing', 'connecting', 'connected']);
		agent.stop();
	});

	test('a send on a socket that closed without an event counts as a drop', () => {
		const f: IFake = fake();
		const states: string[] = [];
		const agent: IFluxLiteAgent = createFluxLiteAgent(
			{ domain: 'https://mesh.test', networkId: 'net', claim: 'x', agentUid: 'x', transport: f.transport },
			{ state: (s: string): number => states.push(s), message: (): void => {}, error: (): void => {} },
		);
		f.answerPost(200, 't');
		f.events().message('isReady');
		const old: IFluxLiteSocketEvents = f.events();
		f.sent.push = (): number => {
			throw new Error('This socket is closed');
		};
		expect(() => agent.publish('device-x', { t: 'l' })).not.toThrow();
		expect(states.slice(-1)).toEqual(['disconnected']);
		old.close(''); // the close event that comes after is from an old socket
		expect(states.filter((s: string): boolean => s === 'disconnected')).toHaveLength(1);
		agent.stop();
	});

	test('backs off on a refused sign-on, up to 30 s', () => {
		const f: IFake = fake();
		createFluxLiteAgent(
			{ domain: 'https://mesh.test', networkId: 'net', claim: 'x', agentUid: 'x', transport: f.transport },
			{ state: (): void => {}, message: (): void => {}, error: (): void => {} },
		);
		const delays: number[] = [];
		let last: number = 0;
		for (let i: number = 0; i < 7; i++) {
			f.answerPost(401, 'refused');
			let waited: number = 0;
			while (f.posts.length === last + 1) {
				jest.advanceTimersByTime(1_000);
				waited += 1_000;
			}
			last++;
			delays.push(waited);
		}
		expect(delays).toEqual([2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000]);
	});

	test('waits 30 minutes before it signs on again after a kick', () => {
		const f: IFake = fake();
		const states: string[] = [];
		createFluxLiteAgent(
			{ domain: 'https://mesh.test', networkId: 'net', claim: 'x', agentUid: 'x', transport: f.transport },
			{ state: (s: string, detail: string | null): number => states.push(`${s} ${detail}`), message: (): void => {}, error: (): void => {} },
		);
		f.answerPost(200, 't');
		f.events().message('isReady');
		f.events().close('Kicked by process');
		expect(states.slice(-1)).toEqual(['disconnected kicked']);
		jest.advanceTimersByTime(1_800_000 - 1);
		expect(f.posts.length).toBe(1);
		jest.advanceTimersByTime(1);
		expect(f.posts.length).toBe(2);
	});

	test('drops the socket when isReady does not come within 20 s', () => {
		const f: IFake = fake();
		const states: string[] = [];
		createFluxLiteAgent(
			{ domain: 'https://mesh.test', networkId: 'net', claim: 'x', agentUid: 'x', transport: f.transport },
			{ state: (s: string, detail: string | null): number => states.push(`${s} ${detail}`), message: (): void => {}, error: (): void => {} },
		);
		f.answerPost(200, 't');
		jest.advanceTimersByTime(20_000 - 1);
		expect(f.closed).toBe(0);
		jest.advanceTimersByTime(1);
		expect(f.closed).toBe(1);
		expect(states.slice(-1)).toEqual(['auth-error socket closed before the mesh was ready: no isReady in 20 s']);
		jest.advanceTimersByTime(2_000);
		expect(f.posts.length).toBe(2);

		// After 'isReady', the timeout does not fire
		f.answerPost(200, 't2');
		f.events().message('isReady');
		jest.advanceTimersByTime(20_000);
		expect(f.closed).toBe(1);
		expect(states.slice(-1)).toEqual(['connected null']);
	});

	test('a silent mesh after a pong counts as a dead socket', () => {
		const f: IFake = fake();
		createFluxLiteAgent(
			{ domain: 'https://mesh.test', networkId: 'net', claim: 'x', agentUid: 'x', transport: f.transport },
			{ state: (): void => {}, message: (): void => {}, error: (): void => {} },
		);
		f.answerPost(200, 't');
		f.events().message('isReady');
		jest.advanceTimersByTime(25_000);
		expect(f.sent).toEqual(['hb-ping']);
		f.events().message('hb-pong');
		jest.advanceTimersByTime(25_000);
		jest.advanceTimersByTime(25_000); // no pong this time
		expect(f.closed).toBe(1);
		expect(f.posts.length).toBe(1);
		jest.advanceTimersByTime(2_000);
		expect(f.posts.length).toBe(2);
	});
});
