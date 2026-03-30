import {
    ChangeDetectionStrategy,
    Component,
    signal,
} from '@angular/core';

@Component({
    selector: 'app-flux-domain',
    templateUrl: './flux-domain.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluxDomainComponent {
    protected readonly domain = 'http://localhost:5100';
    protected readonly isCopied = signal<boolean>(false);

    protected onCopy(
    ): void {
        navigator.clipboard
            .writeText(this.domain)
            .then(() => {
                this.isCopied.set(true);
                setTimeout(() => this.isCopied.set(false), 2_000);
            })
            .catch((err: unknown) => {
                console.error('Failed to copy domain to clipboard', err);
            });
    }
}
