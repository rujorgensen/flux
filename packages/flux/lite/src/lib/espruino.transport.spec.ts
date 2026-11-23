import { describe, expect, jest, test } from 'bun:test';
import { decodeFrames, encodeFrame, espruinoFluxTransport, parseUrl, responseReader, wsKey } from './espruino.transport';

// A `net` socket that records what the POST does with it
const socket = {
	written: '',
	ended: 0,
	handlers: {} as Record<string, (arg?: unknown) => void>,
	write: (data: string): void => {
		socket.written += data;
	},
	end: (): void => {
		socket.ended++;
	},
	on: (event: string, handler: (arg?: unknown) => void): void => {
		socket.handlers[event] = handler;
	},
};
// Bun cannot mock a built-in for require(), so the test patches the module object the transport gets
(require('net') as { connect: unknown; }).connect = (_options: unknown, connected: () => void): typeof socket => {
	socket.written = '';
	socket.ended = 0;
	socket.handlers = {};
	setTimeout(connected, 0);

	return socket;
};

// A server frame: unmasked
const serverFrame = (
	opcode: number,
	text: string,
	fin: boolean,
): string => String.fromCharCode((fin ? 0x80 : 0) | opcode) + (text.length < 126 ? String.fromCharCode(text.length) : String.fromCharCode(126, text.length >> 8, text.length & 255)) + text;

// Undo the client mask, as the server does
const unmask = (
	frame: string,
): { opcode: number; text: string; } => {
	let length: number = frame.charCodeAt(1) & 127;
	let offset: number = 2;
	if (length === 126) {
		length = (frame.charCodeAt(2) << 8) | frame.charCodeAt(3);
		offset = 4;
	}
	const mask: number[] = [0, 1, 2, 3].map((i: number): number => frame.charCodeAt(offset + i));
	let text: string = '';
	for (let i: number = 0; i < length; i++) {
		text += String.fromCharCode(frame.charCodeAt(offset + 4 + i) ^ mask[i & 3]!);
	}

	return { opcode: frame.charCodeAt(0) & 15, text: text };
};

describe('Espruino flux-lite transport', () => {
	test('parses URLs with and without a port', () => {
		expect(parseUrl('https://mesh.persistica.io/auth/network-client?networkId=n')).toEqual({ secure: true, host: 'mesh.persistica.io', port: 443, path: '/auth/network-client?networkId=n' });
		expect(parseUrl('ws://192.168.1.10:8150/?token=t')).toEqual({ secure: false, host: '192.168.1.10', port: 8_150, path: '/?token=t' });
		expect(parseUrl('wss://h')).toEqual({ secure: true, host: 'h', port: 443, path: '/' });
		expect(parseUrl('wss://h?token=t')).toEqual({ secure: true, host: 'h', port: 443, path: '/?token=t' });
		expect(() => parseUrl('mesh.persistica.io')).toThrow();
	});

	test('client frames are masked and round-trip, short and long', () => {
		expect(unmask(encodeFrame(1, 'hb-ping'))).toEqual({ opcode: 1, text: 'hb-ping' });
		const long: string = 'x'.repeat(300);
		expect(unmask(encodeFrame(1, long))).toEqual({ opcode: 1, text: long });
		expect(encodeFrame(1, 'a').charCodeAt(1) & 0x80).toBe(0x80);
	});

	test('splits server frames and keeps an incomplete one for later', () => {
		const long: string = 'y'.repeat(200);
		const data: string = serverFrame(1, 'isReady', true) + serverFrame(1, long, true) + serverFrame(1, 'nc-on', true).slice(0, 4);
		const decoded = decodeFrames(data);
		expect(decoded.frames.map((f) => f.text)).toEqual(['isReady', long]);
		expect(decoded.rest.length).toBe(4);
		expect(decodeFrames(decoded.rest + serverFrame(1, 'nc-on', true).slice(4)).frames[0]!.text).toBe('nc-on');
		expect(decodeFrames(String.fromCharCode(0x81, 127)).tooBig).toBe(true);
		expect(decodeFrames(serverFrame(1, 'a', false)).frames[0]!.fin).toBe(false);
	});

	test('gives the agent the reason from the close frame, and no reason after a plain close', () => {
		const reasons: string[] = [];
		const events = { open: (): void => {}, message: (): void => {}, close: (reason: string): number => reasons.push(reason) };
		espruinoFluxTransport.open('ws://h/?token=t', events);
		socket.handlers['data']!(`HTTP/1.1 101 Switching Protocols\r\n\r\n${serverFrame(8, `${String.fromCharCode(1002 >> 8, 1002 & 255)}Kicked by process`, true)}`);
		socket.handlers['close']!(); // the socket's own close after the frame: no second event
		expect(reasons).toEqual(['Kicked by process']);

		espruinoFluxTransport.open('ws://h/?token=t', events);
		socket.handlers['close']!(false as unknown); // Espruino passes a flag, not a reason
		expect(reasons).toEqual(['Kicked by process', '']);
	});
});

describe('wsKey', (): void => {
	test('is 16 bytes in base64, as RFC 6455 requires', (): void => {
		expect(atob(wsKey()).length).toBe(16);
		expect(wsKey()).not.toBe(wsKey());
	});
});

describe('responseReader', (): void => {
	test('is complete at Content-Length, also when a chunk ends inside the head', (): void => {
		const reader: ReturnType<typeof responseReader> = responseReader();
		expect(reader.add('HTTP/1.1 200 OK\r\nContent-Le')).toBe(false);
		expect(reader.answer()).toBeNull();
		expect(reader.add('ngth: 8\r\n\r\ntick')).toBe(false);
		expect(reader.add('et-1')).toBe(true);
		expect(reader.answer()).toEqual({ status: 200, body: 'ticket-1' });
	});

	test('without Content-Length, the answer is what came when the socket closes', (): void => {
		const reader: ReturnType<typeof responseReader> = responseReader();
		expect(reader.add('HTTP/1.0 401 Unauthorized\r\n\r\nNetwork authority ')).toBe(false);
		expect(reader.add('not found')).toBe(false);
		expect(reader.answer()).toEqual({ status: 401, body: 'Network authority not found' });
		expect(responseReader().answer()).toBeNull();
	});
});

// The heap holds one TLS session: a POST that ends without closing its socket leaves none for the retry (2026-11-20)
describe('post', (): void => {
	const post = (
	): { status: number; body: string; }[] => {
		const answers: { status: number; body: string; }[] = [];
		espruinoFluxTransport.post('http://mesh.test/auth?x=1', 'claim', {}, (status: number, body: string): number => answers.push({ status: status, body: body }));
		jest.advanceTimersByTime(1);

		return answers;
	};

	test('closes the socket when the mesh never answers', (): void => {
		jest.useFakeTimers();
		const answers: { status: number; body: string; }[] = post();
		expect(socket.written).toBe('POST /auth?x=1 HTTP/1.0\r\nHost: mesh.test\r\nContent-Length: 5\r\n\r\nclaim');
		jest.advanceTimersByTime(20_000);
		expect(answers).toEqual([{ status: 0, body: 'timeout' }]);
		expect(socket.ended).toBe(1);
		jest.useRealTimers();
	});

	test('closes the socket once the answer is complete, and answers only when it has closed', (): void => {
		jest.useFakeTimers();
		const answers: { status: number; body: string; }[] = post();
		socket.handlers['data']!('HTTP/1.1 200 OK\r\nContent-Length: 8\r\n\r\nticket-1');
		expect(socket.ended).toBe(1);
		expect(answers).toEqual([]); // the WebSocket would open now, while the TLS session still holds its heap
		socket.handlers['close']!();
		jest.advanceTimersByTime(20_000);
		expect(answers).toEqual([{ status: 200, body: 'ticket-1' }]);
		jest.useRealTimers();
	});
});
