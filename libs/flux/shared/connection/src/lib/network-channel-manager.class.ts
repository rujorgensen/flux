/**
 * Emits network channel events  
 */

import type { TChannelName } from '@flux/shared/types';
import { EventEmitter } from '@flux/shared/utils';

export class NetworkChannelEventEmitter<T extends {
    createChannel: TChannelName,
    emptyChannel: TChannelName,
}> extends EventEmitter<T> {

}