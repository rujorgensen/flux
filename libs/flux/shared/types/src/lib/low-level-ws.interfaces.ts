/**
 * The lowest level of WebSocket interactions.
 */
export const RPC_REQUEST: string = 'rpc-request';
export const RPC_RESPONSE: string = 'rpc-response';
export const CONNECT_TO_CLIENT: string = 'connect-to-client';

// * Channel
export const NETWORK_CHANNEL_PUBLISH: string = 'nc-pub';
export const ON_NETWORK_CHANNEL_PUBLISH: string = 'nc-on-pub';
export const SUBSCRIBE_NETWORK_CHANNEL_NAME: string = 'subscribe-to-nc-name';
export const SUBSCRIBED_NETWORK_CHANNEL_NAME: string = 'subscribed-to-nc-name';
export const UNSUBSCRIBE_NETWORK_CHANNEL_NAME: string = 'unsubscribe-nc-name';
export const UNSUBSCRIBED_NETWORK_CHANNEL_NAME: string = 'unsubscribed-nc-name';

// * For authority-scoped events
export const AUTHORITY_ON_CREATE_CHANNEL: string = 'acc';
export const AUTHORITY_ON_EMPTY_CHANNEL: string = 'aec';
export const AUTHORITY_CHANNEL_SUBSCRIBE: string = 'acs';
export const AUTHORITY_DISCONNECT_AGENT: string = 'ada';
export const AUTHORITY_CHANNEL_UNSUBSCRIBE: string = 'acu';

// * Errors
export const ERROR: string = 'e';