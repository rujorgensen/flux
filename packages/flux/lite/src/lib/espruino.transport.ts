/*
 * The flux-lite transport on Espruino: an HTTP/1.0 POST and a minimal WebSocket client, both over `net` or `tls`. The
 * POST owns its socket, so a timeout can close it: the `http` module has no abort, and a hung request kept its TLS
 * session, which left no heap for the retry (seen on the TTGO, 2026-11-20). TLS on the TTGO needs the firmware that keeps 65 KB of heap free (see tools/build-firmware.sh), and only one
 * TLS connection fits at a time: flux-lite posts the claim first, and opens the socket after the POST has closed.
 *
 * The WebSocket side is only what the Flux mesh needs: text frames, ping, close. No handshake hash check (Espruino has
 * no SHA1 here); the server's "101" status line is the check. Frames over 65535 bytes close the socket.
 */
import type { IFluxLiteSocket, IFluxLiteSocketEvents, IFluxLiteTransport } from './flux-lite.interfaces';

const POST_TIMEOUT_MS: number = 20_000;

interface IUrl {
	secure: boolean;
	host: string;
	port: number;
	path: string; // path and query
}

// Espruino's url.parse drops the port for https; this keeps the four parts flux-lite uses.
// String scanning, not a regex: Espruino 2v29 returns null for /^(\w+):\/\/([^/:?]+).../ (tried on the board).
export const parseUrl = (
	url: string,
): IUrl => {
	const sep: number = url.indexOf('://');
	if (sep < 1) {
		throw new Error(`Bad URL ${url}`);
	}
	const scheme: string = url.slice(0, sep);
	const rest: string = url.slice(sep + 3);
	let end: number = rest.length;
	['/', '?'].forEach((c: string): void => {
		const i: number = rest.indexOf(c);
		if ((i >= 0) && (i < end)) {
			end = i;
		}
	});
	const authority: string = rest.slice(0, end);
	const colon: number = authority.indexOf(':');
	const host: string = colon < 0 ? authority : authority.slice(0, colon);
	if (host === '') {
		throw new Error(`Bad URL ${url}`);
	}
	const secure: boolean = (scheme === 'https') || (scheme === 'wss');
	const path: string = rest.slice(end);

	return { secure: secure, host: host, port: colon < 0 ? (secure ? 443 : 80) : Number(authority.slice(colon + 1)), path: path === '' ? '/' : (path.charAt(0) === '?' ? `/${path}` : path) };
};

/**
 * One client frame: text (opcode 1) or pong (10). A client must set the mask bit and send a key; the key is 0, so the
 * body is the text itself. A random key made two more copies of each message, one character at a time: JS memory this
 * board does not have. The mask stops cache poisoning through proxies that browsers talk to; over wss it does nothing.
 */
export const encodeFrame = (
	opcode: number,
	text: string,
): string => {
	const length: number = text.length;
	let head: string = String.fromCharCode(0x80 | opcode);
	if (length < 126) {
		head += String.fromCharCode(0x80 | length);
	} else {
		head += String.fromCharCode(0x80 | 126, length >> 8, length & 255);
	}

	return `${head}\0\0\0\0${text}`;
};

/**
 * Sec-WebSocket-Key: 16 random bytes, base64. The mesh treats any other length as a plain GET and answers 200, not
 * 101. String(Math.random()) has only 11 digits on Espruino, so the key cannot come from it.
 */
export const wsKey = (
): string => {
	let bytes: string = '';
	for (let i: number = 0; i < 16; i++) {
		bytes += String.fromCharCode(Math.floor(Math.random() * 256));
	}

	return btoa(bytes);
};

export interface IDecoded {
	frames: { opcode: number; fin: boolean; text: string; }[];
	rest: string; // the start of a frame that has not fully arrived
	tooBig: boolean;
}

/**
 * Splits received bytes into server frames (unmasked). Whatever is incomplete comes back as `rest`.
 */
export const decodeFrames = (
	data: string,
): IDecoded => {
	const frames: { opcode: number; fin: boolean; text: string; }[] = [];
	while (data.length >= 2) {
		let length: number = data.charCodeAt(1) & 127;
		let offset: number = 2;
		if (length === 127) {
			return { frames: frames, rest: '', tooBig: true };
		}
		if (length === 126) {
			if (data.length < 4) {
				break;
			}
			length = (data.charCodeAt(2) << 8) | data.charCodeAt(3);
			offset = 4;
		}
		if (data.length < offset + length) {
			break;
		}
		frames.push({ opcode: data.charCodeAt(0) & 15, fin: (data.charCodeAt(0) & 0x80) !== 0, text: data.substr(offset, length) });
		data = data.substr(offset + length);
	}

	return { frames: frames, rest: data, tooBig: false };
};

/**
 * Reads a raw HTTP answer chunk by chunk: the head only until it is complete, then only the body. A parse of the whole
 * answer at each chunk ran the TTGO out of JS memory at sign-on, and a board in that state opens no socket until a
 * reset (2026-11-20). String scanning, not a regex: see parseUrl.
 */
export const responseReader = (
): { add: (data: string) => boolean; answer: () => { status: number; body: string; } | null; } => {
	let head: string = '';
	let body: string | null = null; // null until the head is complete
	let status: number = 0;
	let length: number = -1; // no Content-Length: the answer ends when the socket closes

	return {
		// true once the body has its Content-Length
		add: (data: string): boolean => {
			if (body === null) {
				head += data;
				const end: number = head.indexOf('\r\n\r\n');
				if (end < 0) {
					return false;
				}
				body = head.slice(end + 4);
				const lower: string = head.slice(0, end).toLowerCase();
				head = '';
				const at: number = lower.indexOf('content-length:');
				status = parseInt(lower.slice(lower.indexOf(' ') + 1), 10) || 0;
				length = at < 0 ? -1 : parseInt(lower.slice(at + 15).trim(), 10);
			} else {
				body += data;
			}

			return (length >= 0) && (body.length >= length);
		},
		answer: (): { status: number; body: string; } | null => (body === null ? null : { status: status, body: body }),
	};
};

const post = (
	url: string,
	body: string,
	headers: Record<string, string>,
	done: (status: number, body: string) => void,
): void => {
	const u: IUrl = parseUrl(url);
	let sock: any = null;
	const reader: ReturnType<typeof responseReader> = responseReader();
	let finished: boolean = false;
	const finish = (status: number, text: string): void => {
		if (!finished) {
			finished = true;
			clearTimeout(timer);
			if (sock) {
				sock.end();
			}
			done(status, text);
		}
	};
	const timer: any = setTimeout((): void => finish(0, 'timeout'), POST_TIMEOUT_MS);
	headers['Content-Length'] = String(body.length);
	const head: string = Object.keys(headers).map((k: string): string => `${k}: ${headers[k]}\r\n`).join('');
	try {
		sock = require(u.secure ? 'tls' : 'net').connect({ host: u.host, port: u.port }, (): void => {
			// HTTP/1.0: the answer is never chunked
			sock.write(`POST ${u.path} HTTP/1.0\r\nHost: ${u.host}\r\n${head}\r\n${body}`);
		});
		sock.on('data', (data: string): void => {
			// Close now, answer on 'close': only then is the TLS session's heap free for the WebSocket that follows
			if (reader.add(data)) {
				sock.end();
			}
		});
		sock.on('close', (): void => {
			sock = null;
			const answer: { status: number; body: string; } | null = reader.answer();
			finish(answer ? answer.status : 0, answer ? answer.body : 'connection closed');
		});
		sock.on('error', (e: any): void => {
			// After a full answer, mbedTLS reports the server's close_notify as error -30848 ("unknown error"); the
			// 'close' that follows delivers the answer. Seen on the TTGO with the Flux mesh, 2026-11-18.
			if (!reader.answer()) {
				finish(0, String((e && e.message) || e));
			}
		});
	} catch (e) {
		// Espruino throws, not emits, when it cannot even start (e.g. no memory for TLS)
		finish(0, String(e));
	}
};

const open = (
	url: string,
	events: IFluxLiteSocketEvents,
): IFluxLiteSocket => {
	const u: IUrl = parseUrl(url);
	let sock: any = null;
	let upgraded: boolean = false;
	let buffer: string = '';
	let partial: string = ''; // a fragmented message so far
	let closed: boolean = false;

	// Also the 'close' and 'error' handler: those pass a flag or an error, not a reason
	const close = (reason?: unknown): void => {
		if (!closed) {
			closed = true;
			if (sock) {
				sock.end();
			}
			events.close(typeof reason === 'string' ? reason : '');
		}
	};

	const onData = (data: string): void => {
		buffer += data;
		if (!upgraded) {
			const end: number = buffer.indexOf('\r\n\r\n');
			if (end < 0) {
				return;
			}
			if (buffer.indexOf(' 101 ') < 0) {
				close();

				return;
			}
			upgraded = true;
			buffer = buffer.slice(end + 4);
			events.open();
		}
		const decoded: IDecoded = decodeFrames(buffer);
		buffer = decoded.rest;
		decoded.frames.forEach((frame: { opcode: number; fin: boolean; text: string; }): void => {
			if (frame.opcode === 9) {
				sock.write(encodeFrame(10, frame.text));
			} else if (frame.opcode === 8) {
				// Close frame: a 2-byte status code, then the reason ('Kicked by process')
				close(frame.text.substr(2));
			} else if ((frame.opcode === 1) || (frame.opcode === 0)) {
				partial += frame.text;
				if (frame.fin) {
					const text: string = partial;
					partial = '';
					// Bytes as they came: this firmware has no Unicode strings, and the payloads are ASCII
					events.message(text);
				}
			}
		});
		if (decoded.tooBig) {
			close();
		}
	};

	try {
		sock = require(u.secure ? 'tls' : 'net').connect({ host: u.host, port: u.port }, (): void => {
			const key: string = wsKey();
			sock.write(`GET ${u.path} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
		});
		sock.on('data', onData);
		sock.on('close', close);
		sock.on('error', close);
	} catch {
		setTimeout(close, 0);
	}

	return {
		send: (text: string): void => {
			if (upgraded && !closed) {
				sock.write(encodeFrame(1, text));
			}
		},
		close: close,
	};
};

export const espruinoFluxTransport: IFluxLiteTransport = { post: post, open: open };
