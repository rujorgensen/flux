import type { TChannelName } from '../channel.type';

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
