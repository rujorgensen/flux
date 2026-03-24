import { Component, input, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { onDataUsageUpdate } from '../../data/flux/data-usage.service.fn';
import type { TNetworkAgentCountAt, TNetworkAuthorityCountAt, TNetworkChannelCountAt, TNetworkId_S } from '@flux/shared/types';
import type { FluxAgentNetworkConnection } from '@persistica/flux-agent';
import { getFluxNetworkConnection } from '../../data/flux-connection.fn';
import { TotalDataUsageComponent } from './panes/total-data-usage/total-data-usage.component';
import { ConnectedAuthoritiesComponent } from './panes/connected-authorities/connected-authorities.component';
import { ConnectedAgentsComponent } from './panes/connected-agents/connected-agents.component';
import { ActiveChannelsComponent } from './panes/active-channels/active-channels.component';
import { onConnectedAgentCount } from '../../data/flux/connected-agents.service.fn';
import { onConnectedAuthoritiesCount } from '../../data/flux/connected-authorities.service.fn';
import { onActiveChannelCount } from '../../data/flux/channels.service.fn';

@Component({
    selector: 'app-stats',
    imports: [
        TotalDataUsageComponent,
        ConnectedAuthoritiesComponent,
        ConnectedAgentsComponent,
        ActiveChannelsComponent,
    ],
    styleUrl: './stats.component.css',
    templateUrl: './stats.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsComponent {
    public readonly networkId = input.required<TNetworkId_S | null>();
    public readonly networkCode = input.required<string | null>();

    protected readonly totalDataUsage = signal<number | undefined>(undefined);
    protected readonly activeChannelCount = signal<TNetworkChannelCountAt | undefined>(undefined);
    protected readonly activeAgentCount = signal<TNetworkAgentCountAt | undefined>(undefined);
    protected readonly connectedAuthoritiesCount = signal<TNetworkAuthorityCountAt | undefined>(undefined);

    constructor() {
        const updateDataUsage = async (
            networkId: TNetworkId_S,
            networkCode: string,
        ) => {
            try {
                const fluxAgentNetworkConnection: FluxAgentNetworkConnection =
                    await getFluxNetworkConnection(
                        networkId,
                        networkCode,
                        "data-usage",
                    );

                (await onDataUsageUpdate(fluxAgentNetworkConnection))(
                    this.totalDataUsage.set,
                );
            } catch (error) {
                console.error("Error connecting agent to network:", error);
            }
        };

        const updateNetworkConnections = async (networkId: TNetworkId_S, networkCode: string) => {
            try {
                const fluxAgentNetworkConnection: FluxAgentNetworkConnection =
                    await getFluxNetworkConnection(
                        networkId as TNetworkId_S,
                        networkCode,
                        "portal-agent",
                    );

                (await onActiveChannelCount(fluxAgentNetworkConnection))(
                    this.activeChannelCount.set,
                );
            } catch (error) {
                console.error("Error connecting agent to network:", error);
            }
        };

        const updateAgentCount = async (networkId: TNetworkId_S, networkCode: string) => {
            try {
                const fluxAgentNetworkConnection: FluxAgentNetworkConnection =
                    await getFluxNetworkConnection(
                        networkId,
                        networkCode,
                        "portal-agent",
                    );

                (await onConnectedAgentCount(fluxAgentNetworkConnection))(
                    this.activeAgentCount.set,
                );
            } catch (error) {
                console.error("Error connecting agent to network:", error);
            }
        };

        const updateAuthorities = async (networkId: TNetworkId_S, networkCode: string) => {
            try {
                const fluxAgentNetworkConnection: FluxAgentNetworkConnection =
                    await getFluxNetworkConnection(
                        networkId,
                        networkCode,
                        "portal-authority",
                    );

                (await onConnectedAuthoritiesCount(fluxAgentNetworkConnection))(
                    this.connectedAuthoritiesCount.set,
                );
            } catch (error) {
                console.error("Error connecting agent to network:", error);
            }
        };

        effect(() => {
            const networkId = this.networkId();
            const networkCode = this.networkCode();

            if (networkId === null || networkCode === null) {
                return;
            }

            updateDataUsage(networkId, networkCode);
            updateNetworkConnections(networkId, networkCode);
            updateAgentCount(networkId, networkCode);
            updateAuthorities(networkId, networkCode);
        });
    }
}
