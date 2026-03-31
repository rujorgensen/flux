import { ChangeDetectionStrategy, Component, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TNetworkAuthority } from '@flux/shared/types';
import { api } from '$lib/app/_services/api/api';
import { toast } from 'ngx-sonner';

@Component({
    selector: 'app-connected-authorities-table',
    imports: [CommonModule],
    templateUrl: './connected-authorities-table.component.html',
    styleUrls: ['./connected-authorities-table.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAuthoritiesTableComponent {
    public readonly networkId = input.required<string>();

    protected readonly dataStore = signal<TNetworkAuthority[] | undefined>(undefined);
    protected readonly kickingAuthorityId = signal<string | null>(null);

    constructor() {
        effect(() => {
            const networkId = this.networkId();
            if (networkId) {
                this.fetchData(networkId);
            }
        });
    }

    protected async onKickAuthority(
        authority: TNetworkAuthority,
    ): Promise<void> {
        const networkId = this.networkId();
        if (!networkId) return;

        this.kickingAuthorityId.set(authority.id);

        await api
            .api
            .networks({
                networkId,
            })
            .authorities({
                authorityId: authority.id,
            })
            .delete()
            .then(() => {
                this.dataStore.update((data) => data?.filter((a) => a.id !== authority.id));
                toast.success(`Authority ${authority.id} kicked successfully.`);
            })
            .catch((error: unknown) => {
                console.error('Error kicking authority:', error);
                toast.error('Failed to kick authority. Please try again.');
            })
            .finally(() => {
                this.kickingAuthorityId.set(null);
            });
    }

    private fetchData(
        networkId: string,
    ) {
        api
            .api
            .networks({
                networkId,
            })
            .authorities
            .connected
            .get()
            .then((response) => {
                if (response.data) {
                    this.dataStore.set(response.data);
                }
            })
            .catch((error: unknown) => {
                console.error('Error fetching data', error);
            })
            ;
    }
}
