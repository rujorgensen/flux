import type { TChannelName } from '../channel.type';

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
