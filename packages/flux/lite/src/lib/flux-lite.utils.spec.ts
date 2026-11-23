import { describe, expect, test } from 'bun:test';
import { authUrl, decodePayload, encodePayload, parseFrame, socketUrl } from './flux-lite.utils';

describe('flux-lite wire format', () => {
	test('builds the sign-on and socket URLs', () => {
		expect(authUrl('https://mesh.persistica.io', 'cobalia-probes', '083af247-55a8'))
			.toBe('https://mesh.persistica.io/auth/network-client?networkId=cobalia-probes&requestedAgentUid=083af247-55a8');
		expect(socketUrl('https://mesh.persistica.io', 'a.b+c')).toBe('wss://mesh.persistica.io/?token=a.b%2Bc');
		expect(socketUrl('http://localhost:3000', 't')).toBe('ws://localhost:3000/?token=t');
	});

	test('tags and untags payloads', () => {
		expect(encodePayload({ m: [1] })).toBe('o:{"m":[1]}');
		expect(encodePayload('o:x')).toBe('s:o:x');
		expect(decodePayload('o:{"m":[1]}')).toEqual({ m: [1] });
		expect(decodePayload('s:o:x')).toBe('o:x');
		expect(decodePayload('o:{broken')).toBe('{broken');
		expect(decodePayload('raw')).toBe('raw');
	});

	test('parses frames', () => {
		expect(parseFrame('isReady')).toEqual({ kind: 'ready' });
		expect(parseFrame('hb-pong')).toEqual({ kind: 'pong' });
		expect(parseFrame('subscribed-to-nc-name:probe-5-1')).toEqual({ kind: 'joined', channel: 'probe-5-1' });
		expect(parseFrame('e:Not authorized')).toEqual({ kind: 'error', message: 'Not authorized' });
		expect(parseFrame('nc-on-pub:agent-1:probe-5-1:o:{"m":[7.5],"d":1}')).toEqual({ kind: 'publish', channel: 'probe-5-1', data: { m: [7.5], d: 1 } });
		// A colon inside the payload stays in the payload
		expect(parseFrame('nc-on-pub:a:c:s:x:y')).toEqual({ kind: 'publish', channel: 'c', data: 'x:y' });
		expect(parseFrame('nc-on-pub:broken')).toEqual({ kind: 'other', text: 'nc-on-pub:broken' });
		expect(parseFrame('rpc-request:{}')).toEqual({ kind: 'other', text: 'rpc-request:{}' });
	});
});
