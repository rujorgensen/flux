import { ChangeDetectionStrategy, Component, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TNetworkAgent } from '@flux/mesh/store/redis/network-agent';
import { api } from '$lib/app/_services/api/api';

@Component({
    selector: 'app-connected-agents-table',
    imports: [CommonModule],
    templateUrl: './connected-agents-table.component.html',
    styleUrls: ['./connected-agents-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAgentsTableComponent {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<TNetworkAgent[] | undefined>(undefined);

    constructor(

    ) {
        effect(() => {
            const networkId = this.networkId();
            if (networkId) {
                this.fetchData(networkId);
            }
        });
    }

    private async fetchData(
        networkId: string,
    ) {
        await api
            .api
            .networks({
                networkId,
            })
            .agents
            .connected
            .get({

            })

            .then((response) => {
                if (response.data) {
                    this.dataStore.set(response.data);
                }
            })
            .catch((error) => {
                console.error('Error fetching connected agents:', error);
            })
            ;
    }
}
