import type { TChannelName } from './channel.type';
import type { TAgentOwnUId } from './client.type';

/**
 * The lowest level of WebSocket interactions.
 */
export const RPC_REQUEST = 'rpc-request';
export const RPC_RESPONSE = 'rpc-response';
export const CONNECT_TO_CLIENT = 'connect-to-client';

// * Channel
export const NETWORK_CHANNEL_PUBLISH = 'nc-pub';
export const ON_NETWORK_CHANNEL_PUBLISH = 'nc-on-pub';
export const SUBSCRIBE_NETWORK_CHANNEL_NAME = 'subscribe-to-nc-name';
export const SUBSCRIBED_NETWORK_CHANNEL_NAME = 'subscribed-to-nc-name';
export const UNSUBSCRIBE_NETWORK_CHANNEL_NAME = 'unsubscribe-nc-name';
export const UNSUBSCRIBED_NETWORK_CHANNEL_NAME = 'unsubscribed-nc-name';

// * For authority-scoped events
export const AUTHORITY_ON_CREATE_CHANNEL = 'acc';
export const AUTHORITY_ON_EMPTY_CHANNEL = 'aec';
export const AUTHORITY_CHANNEL_SUBSCRIBE = 'acs';
export const AUTHORITY_DISCONNECT_AGENT = 'ada';

// * Heartbeat — client-driven keepalive so a half-open socket (close code 1006,
// no close frame) is detected; the mesh echoes every ping with a pong.
export const HEARTBEAT_PING = 'hb-ping';
export const HEARTBEAT_PONG = 'hb-pong';

// * Errors
export const ERROR = 'e';

// Allowed message types on the ws interface
export type TFluxWebSocketClientMessage =
    | typeof AUTHORITY_CHANNEL_SUBSCRIBE
    | typeof HEARTBEAT_PING
    | `${typeof AUTHORITY_DISCONNECT_AGENT}:${string}`
    | `${typeof CONNECT_TO_CLIENT}:${TAgentOwnUId}`
    | `${typeof NETWORK_CHANNEL_PUBLISH}:${TChannelName}:${string}`
    | `${typeof SUBSCRIBE_NETWORK_CHANNEL_NAME}:${TChannelName}`
    | `${typeof UNSUBSCRIBE_NETWORK_CHANNEL_NAME}:${TChannelName}`
    | `${typeof RPC_REQUEST}:${string}`
    | `${typeof RPC_RESPONSE}:${string}`;