import {
    ChangeDetectionStrategy,
    Component,
    signal,
} from '@angular/core';

interface IFluxDomainLocation {
    hostname: string;
    origin: string;
    protocol: string;
}

interface IResolvedFluxDomain {
    domain: string;
    isVisible: boolean;
}

const DEFAULT_FLUX_DOMAIN = 'http://localhost:5100';

function isLocalHostname(
    hostname: string,
): boolean {
    return hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '::1'
        || hostname === '[::1]';
}

function getLocalFluxDomain(
    protocol: string,
    hostname: string,
): string {
    const normalizedHostname: string = hostname === '::1'
        ? '[::1]'
        : hostname;

    return `${protocol}//${normalizedHostname}:5100`;
}

export function resolveFluxDomain(
    location: IFluxDomainLocation | undefined,
): IResolvedFluxDomain {
    if (!location) {
        return {
            domain: DEFAULT_FLUX_DOMAIN,
            isVisible: true,
        };
    }

    if (isLocalHostname(location.hostname)) {
        return {
            domain: getLocalFluxDomain(location.protocol, location.hostname),
            isVisible: true,
        };
    }

    const hostnameParts: string[] = location.hostname.split('.');
    if (hostnameParts[0] === 'mesh') {
        return {
            domain: location.origin,
            isVisible: false,
        };
    }

    const meshHostname: string = hostnameParts.length > 2
        ? ['mesh', ...hostnameParts.slice(1)].join('.')
        : `mesh.${location.hostname}`;

    return {
        domain: `${location.protocol}//${meshHostname}`,
        isVisible: true,
    };
}

@Component({
    selector: 'app-flux-domain',
    templateUrl: './flux-domain.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluxDomainComponent {
    private readonly resolvedDomain = resolveFluxDomain(
        typeof window !== 'undefined'
            ? window.location
            : undefined,
    );

    protected readonly domain = this.resolvedDomain.domain;
    protected readonly shouldShowDomain = this.resolvedDomain.isVisible;
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
