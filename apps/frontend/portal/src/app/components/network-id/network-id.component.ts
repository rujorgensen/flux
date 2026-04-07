import {
    ChangeDetectionStrategy,
    Component,
    input,
    signal,
} from '@angular/core';

@Component({
    selector: 'app-network-id',
    templateUrl: './network-id.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkIdComponent {
    readonly networkId = input.required<string>();

    protected readonly isCopied = signal<boolean>(false);

    protected onCopy(
    ): void {
        navigator.clipboard
            .writeText(this.networkId())
            .then(() => {
                this.isCopied.set(true);
                setTimeout(() => this.isCopied.set(false), 2_000);
            })
            .catch((err: unknown) => {
                console.error('Failed to copy network ID to clipboard', err);
            });
    }
}
