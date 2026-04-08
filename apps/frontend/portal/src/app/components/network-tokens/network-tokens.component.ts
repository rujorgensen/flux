import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    inject,
    input,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { toast } from 'ngx-sonner';
import { NetworkTokensService, type ITokenMetadata } from '$lib/app/_services/network-tokens/network-tokens.service';

export interface INetworkToken {
    id: string;
    index: number;
    isPrimary: boolean;
    entityCount: number;
    createdAt: Date;
    createdBy: string;
    rotatedOutAt: Date | null;
}

const MAX_TOKENS = 3;

@Component({
    selector: 'app-network-tokens',
    imports: [CommonModule],
    templateUrl: './network-tokens.component.html',
    styleUrls: ['./network-tokens.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkTokensComponent {
    public readonly networkId = input.required<string>();

    protected readonly tokens = signal<INetworkToken[] | undefined>(undefined);
    protected readonly isLoading = signal<boolean>(false);
    protected readonly maxTokens = MAX_TOKENS;
    /** Map of token id → revealed token string. */
    protected readonly revealedTokens = signal<Map<string, string>>(new Map());
    protected readonly revealingTokenId = signal<string | null>(null);
    protected readonly copiedTokenId = signal<string | null>(null);

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        protected readonly _networkTokensService: NetworkTokensService,
    ) {
        effect(() => {
            const networkId = this.networkId();
            if (networkId) {
                this.fetchTokens(networkId);
            }
        });
    }

    protected canAddToken(

    ): boolean {
        const currentTokens = this.tokens();
        return currentTokens !== undefined && currentTokens.length < MAX_TOKENS;
    }

    protected onGenerateToken(

    ): void {
        const networkId = this.networkId();
        if (!networkId) return;

        this.isLoading.set(true);

        this._networkTokensService
            .createToken$(
                networkId,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (newToken: ITokenMetadata) => {
                    const token: INetworkToken = {
                        ...newToken,
                        createdAt: new Date(newToken.createdAt),
                        rotatedOutAt: newToken.rotatedOutAt ? new Date(newToken.rotatedOutAt) : null,
                    };
                    // New token is primary (index 0); demote existing tokens
                    const current = (this.tokens() ?? []).map((t, i) => ({
                        ...t,
                        index: i + 1,
                        isPrimary: false,
                        rotatedOutAt: t.rotatedOutAt ?? new Date(),
                    }));
                    this.tokens.set([token, ...current]);
                    this.isLoading.set(false);
                    toast.success('New token generated successfully.');
                },
                error: (err: unknown) => {
                    console.error('Error generating token', err);
                    toast.error('Failed to generate token. Please try again.');
                    this.isLoading.set(false);
                },
            });
    }

    protected onRevealToken(
        token: INetworkToken,
    ): void {
        const networkId = this.networkId();
        if (!networkId) return;

        this.revealingTokenId.set(token.id);

        this._networkTokensService
            .revealToken$(
                networkId,
                token.index,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (value: string) => {
                    this.revealedTokens.update((map) => {
                        const updated = new Map(map);
                        updated.set(token.id, value);
                        return updated;
                    });
                    this.revealingTokenId.set(null);
                },
                error: (err: unknown) => {
                    console.error('Error revealing token', err);
                    toast.error('Failed to reveal token. Please try again.');
                    this.revealingTokenId.set(null);
                },
            });
    }

    protected onHideToken(
        tokenId: string,
    ): void {
        this.revealedTokens.update((map) => {
            const updated = new Map(map);
            updated.delete(tokenId);
            return updated;
        });
    }

    protected onCopyToken(
        tokenId: string,
    ): void {
        const value = this.revealedTokens().get(tokenId);
        if (!value) return;

        navigator.clipboard
            .writeText(value)
            .then(() => {
                this.copiedTokenId.set(tokenId);
                timer(2_000)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(() => this.copiedTokenId.set(null));
            })
            .catch((err: unknown) => {
                console.error('Failed to copy token to clipboard', err);
            });
    }

    protected onRemoveToken(
        token: INetworkToken,
    ): void {
        const networkId = this.networkId();
        if (!networkId) return;

        this.isLoading.set(true);

        this._networkTokensService
            .delete$(
                networkId,
                token.index,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    const current = this.tokens() ?? [];
                    const updated = current.filter((t) => t.id !== token.id);

                    // Re-assign primary flag and index to remaining tokens after removal
                    const remapped: INetworkToken[] = updated.map((t, i) => ({
                        ...t,
                        index: i,
                        isPrimary: i === 0,
                    }));

                    this.tokens.set(remapped);

                    // Remove any revealed value for the deleted token
                    this.revealedTokens.update((map) => {
                        const updatedMap = new Map(map);
                        updatedMap.delete(token.id);
                        return updatedMap;
                    });

                    this.isLoading.set(false);
                    toast.success('Token removed successfully.');
                },
                error: (err: unknown) => {
                    console.error('Error removing token', err);
                    toast.error('Failed to remove token. Please try again.');
                    this.isLoading.set(false);
                },
            });
    }

    private fetchTokens(
        networkId: string,
    ): void {
        this.isLoading.set(true);

        this._networkTokensService
            .readTokens$(
                networkId,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (data: ITokenMetadata[]) => {
                    const mapped: INetworkToken[] = data.map((t) => ({
                        ...t,
                        createdAt: new Date(t.createdAt),
                        rotatedOutAt: t.rotatedOutAt ? new Date(t.rotatedOutAt) : null,
                    }));
                    this.tokens.set(mapped);
                    this.isLoading.set(false);
                },
                error: (err: unknown) => {
                    console.error('Error fetching tokens', err);
                    this.tokens.set([]);
                    this.isLoading.set(false);
                },
            });
    }
}
