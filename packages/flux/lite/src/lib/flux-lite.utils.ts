/*
 * The Flux wire format, as pure functions. Frames are text: `<type>:<rest>`. Payloads carry a tag: `o:` JSON, `s:` string.
 */

export type TFluxLiteFrame =
	{ kind: 'ready'; }
	| { kind: 'pong'; }
	| { kind: 'joined'; channel: string; }
	| { kind: 'left'; channel: string; }
	| { kind: 'publish'; channel: string; data: unknown; }
	| { kind: 'error'; message: string; }
	| { kind: 'other'; text: string; };

// Query values are plain: network ids and agent ids are letters, digits and dashes
export const authUrl = (
	domain: string,
	networkId: string,
	agentUid: string,
): string => `${domain}/auth/network-client?networkId=${encodeURIComponent(networkId)}&requestedAgentUid=${encodeURIComponent(agentUid)}`;

export const socketUrl = (
	domain: string,
	ticket: string,
): string => `${domain.replace(/^http/, 'ws')}/?token=${encodeURIComponent(ticket)}`;

export const encodePayload = (
	data: unknown,
): string => (typeof data === 'string' ? `s:${data}` : `o:${JSON.stringify(data)}`);

// Untagged payloads are legacy raw strings; JSON that does not parse stays a string, as in @persistica/flux-agent
export const decodePayload = (
	raw: string,
): unknown => {
	if (raw.indexOf('o:') === 0) {
		try {
			return JSON.parse(raw.slice(2));
		} catch {
			return raw.slice(2);
		}
	}

	return raw.indexOf('s:') === 0 ? raw.slice(2) : raw;
};

export const parseFrame = (
	text: string,
): TFluxLiteFrame => {
	if (text === 'isReady') {
		return { kind: 'ready' };
	}
	if (text === 'hb-pong') {
		return { kind: 'pong' };
	}

	const colon: number = text.indexOf(':');
	const type: string = colon < 0 ? text : text.slice(0, colon);
	const rest: string = text.slice(colon + 1);

	switch (type) {
		case 'subscribed-to-nc-name':
			return { kind: 'joined', channel: rest };
		case 'unsubscribed-nc-name':
			return { kind: 'left', channel: rest };
		case 'e':
			return { kind: 'error', message: rest };
		case 'nc-on-pub': {
			// nc-on-pub:<sender agent>:<channel>:<payload>; channel names have no colon
			const afterSender: number = rest.indexOf(':');
			const afterChannel: number = rest.indexOf(':', afterSender + 1);
			if ((afterSender < 0) || (afterChannel < 0)) {
				return { kind: 'other', text: text };
			}

			return { kind: 'publish', channel: rest.slice(afterSender + 1, afterChannel), data: decodePayload(rest.slice(afterChannel + 1)) };
		}
		default:
			return { kind: 'other', text: text };
	}
};
