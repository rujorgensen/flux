/*
 * What flux-lite needs from its runtime, and what it gives back. No runtime types: a microcontroller, a browser and Bun
 * each supply their own transport.
 */

export interface IFluxLiteSocket {
	send(text: string): void;
	close(): void;
}

export interface IFluxLiteSocketEvents {
	open(): void;
	message(text: string): void;
	// Also after a failed open, so the agent always learns that the socket is gone. `reason` is the reason in the
	// server's close frame ('Kicked by process' after a kick), or '' when there is none.
	close(reason: string): void;
}

export interface IFluxLiteTransport {
	/**
	 * One HTTP POST. done() gets the status and the body; status 0 is a transport failure (no answer).
	 */
	post(url: string, body: string, headers: Record<string, string>, done: (status: number, body: string) => void): void;
	open(url: string, events: IFluxLiteSocketEvents): IFluxLiteSocket;
}

export interface IFluxLiteOptions {
	domain: string; // the Mesh, with protocol: https://mesh.persistica.io
	networkId: string;
	claim: string; // what the network's Authority checks in authorizeAgentConnection
	agentUid: string; // the agent's own stable id
	transport: IFluxLiteTransport;
}

// No 'waiting-for-authority' of its own: the mesh answers that with a 401, and flux-lite retries every sign-on failure
export type TFluxLiteState = 'authorizing' | 'connecting' | 'connected' | 'disconnected' | 'auth-error';

export interface IFluxLiteHandlers {
	// detail: why, for 'auth-error'; 'kicked' for a 'disconnected' after the mesh kicked the agent
	state(state: TFluxLiteState, detail: string | null): void;
	message(channel: string, data: unknown): void;
	// An `e:` frame from the mesh, e.g. "Not authorized" for a channel the Authority refused
	error(message: string): void;
}

export interface IFluxLiteAgent {
	join(channel: string): void;
	leave(channel: string): void;
	publish(channel: string, data: unknown): void;
	stop(): void;
}
