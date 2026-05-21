import type { TChannelName } from '../channel.type';
import type { TAddress } from '../routing.type';

export type TNetworkChannelCountAt = {
    count: number;
    date: Date;
};

export interface INetworkChannel {
    channelName: TChannelName;
    memberDistribution: string;
    members: number;
    bytes: number;
    createdAt: Date;
}

export interface INetworkChannelMembers {
    channelName: TChannelName;
    memberAddresses: TAddress[];
}
