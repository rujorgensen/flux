import { ChangeDetectionStrategy, Component, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TNetworkAgent } from '@flux/mesh/store/redis/network-agent';
import { api } from '$lib/app/_services/api/api';
import { toast } from 'ngx-sonner';

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
    protected readonly kickingAgentId = signal<string | null>(null);

    constructor(

    ) {
        effect(() => {
            const networkId = this.networkId();
            if (networkId) {
                this.fetchData(networkId);
            }
        });
    }

    protected async onKickAgent(
        agent: TNetworkAgent,
    ): Promise<void> {
        const networkId = this.networkId();
        if (!networkId) return;

        this.kickingAgentId.set(agent.id);

        await api
            .api
            .networks({
                networkId,
            })
            .agents({
                agentId: agent.id,
            })
            .delete()
            .then(() => {
                this.dataStore.update((data) => data?.filter((a) => a.id !== agent.id));
                toast.success(`Agent ${agent.uid ?? agent.id} kicked successfully.`);
            })
            .catch((error: unknown) => {
                console.error('Error kicking agent:', error);
                toast.error('Failed to kick agent. Please try again.');
            })
            .finally(() => {
                this.kickingAgentId.set(null);
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
