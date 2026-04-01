import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
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
    protected readonly page = signal<number>(1);
    protected readonly pageSize = signal<number>(25);
    protected readonly total = signal<number>(0);
    protected readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize()) || 1);

    constructor() {
        effect(() => {
            const networkId = this.networkId();
            const page = this.page();
            const pageSize = this.pageSize();
            if (networkId) {
                this.fetchData(networkId, page, pageSize);
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

    protected nextPage(): void {
        this.page.update((p) => p + 1);
    }

    protected prevPage(): void {
        this.page.update((p) => Math.max(1, p - 1));
    }

    protected onPageSizeChange(event: Event): void {
        this.pageSize.set(Number((event.target as HTMLSelectElement).value));
        this.page.set(1);
    }

    private async fetchData(
        networkId: string,
        page: number,
        pageSize: number,
    ): Promise<void> {
        await api
            .api
            .networks({
                networkId,
            })
            .agents
            .connected
            .get({
                query: { page, pageSize },
            })
            .then((response) => {
                if (response.data) {
                    this.dataStore.set(response.data.data);
                    this.total.set(response.data.total);
                }
            })
            .catch((error) => {
                console.error('Error fetching connected agents:', error);
            })
            ;
    }
}
