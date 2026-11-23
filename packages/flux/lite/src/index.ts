export { createFluxLiteAgent } from './lib/flux-lite.agent';
export type {
	IFluxLiteAgent,
	IFluxLiteHandlers,
	IFluxLiteOptions,
	IFluxLiteSocket,
	IFluxLiteSocketEvents,
	IFluxLiteTransport,
	TFluxLiteState,
} from './lib/flux-lite.interfaces';
export { authUrl, decodePayload, encodePayload, parseFrame, socketUrl } from './lib/flux-lite.utils';
export type { TFluxLiteFrame } from './lib/flux-lite.utils';
export { espruinoFluxTransport } from './lib/espruino.transport';
