import { inject, Component, input, signal, type OnInit, ChangeDetectionStrategy, effect } from '@angular/core';
import { provideHttpClient, HttpClient, withFetch } from '@angular/common/http';

import { onDataUsageUpdate } from "../../../data/flux/data-usage.service.fn.ts";
import type { TNetworkAgentCountAt, TNetworkAuthorityCountAt, TNetworkChannelCountAt, TNetworkId_S } from "@flux/shared/types";
import type { FluxAgentNetworkConnection } from "@persistica/flux-agent";
import { getFluxNetworkConnection } from '$lib/data/flux-connection.fn';
import { TotalDataUsageComponent } from './panes/total-data-usage/total-data-usage.component.ts';
import { ConnectedAuthoritiesComponent } from './panes/connected-authorities/connected-authorities.component.ts';
import { ConnectedAgentsComponent } from './panes/connected-agents/connected-agents.component.ts';
import { ActiveChannelsComponent } from './panes/active-channels/active-channels.component.ts';
import { onConnectedAgentCount } from '$lib/data/flux/connected-agents.service.fn.ts';
import { onConnectedAuthoritiesCount } from '$lib/data/flux/connected-authorities.service.fn.ts';
import { onActiveChannelCount } from '$lib/data/flux/channels.service.fn.ts';

interface Todo {
    id: number;
    title: string;
    completed: boolean;
}

@Component({
    selector: 'app-hello',
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
export class StatsComponent implements OnInit {
    networkId = input.required<TNetworkId_S | null>();
    networkCode = input.required<string | null>();

    protected readonly totalDataUsage = signal<number | undefined>(undefined);
    protected readonly activeChannelCount = signal<TNetworkChannelCountAt | undefined>(undefined);
    protected readonly activeAgentCount = signal<TNetworkAgentCountAt | undefined>(undefined);
    protected readonly connectedAuthoritiesCount = signal<TNetworkAuthorityCountAt | undefined>(undefined);

    helpText = input('help');

    show = signal(false);

    toggle() {
        this.show.update((show) => !show);
    }

    static clientProviders = [provideHttpClient(
        withFetch()
    )];
    static renderProviders = [StatsComponent.clientProviders];

    http = inject(HttpClient);
    todos = signal<Todo[]>([]);

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

                // Update on new data
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

                // Update on new data
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

                // Update on new data
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

                // Update on new data
                (await onConnectedAuthoritiesCount(fluxAgentNetworkConnection))(
                    this.connectedAuthoritiesCount.set,
                );
            } catch (error) {
                console.error("Error connecting agent to network:", error);
            }
        };

        // Export the store directly
        effect(() => {
            const networkId = this.networkId();
            const networkCode = this.networkCode();

            console.log(`The networkCode is: ${networkCode}`);
            console.log(`The networkId is: ${networkId}`);

            if (networkId === null || networkCode === null) {
                return;
            }

            updateDataUsage(networkId, networkCode);
            updateNetworkConnections(networkId, networkCode);
            updateAgentCount(networkId, networkCode);
            updateAuthorities(networkId, networkCode);
        });
    }

    ngOnInit() {
        this.http
            .get<Todo[]>('https://jsonplaceholder.typicode.com/todos')
            .subscribe((todos) => this.todos.set(todos));
    }
}