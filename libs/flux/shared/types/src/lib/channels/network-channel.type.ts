import type { TChannelName } from '../channel.type';
import type { TAddress } from '../routing.type';

export type TNetworkChannelCountAt = {
    count: number;
    date: Date;
};

export interface INetworkChannelState {
    channelName: TChannelName;
    memberDistribution: string;
    members: number;
}

export interface INetworkChannel extends INetworkChannelState {
    bytes: number;
    createdAt: Date;
}

export interface INetworkChannelMembers {
    channelName: TChannelName;
    memberAddresses: TAddress[];
}
