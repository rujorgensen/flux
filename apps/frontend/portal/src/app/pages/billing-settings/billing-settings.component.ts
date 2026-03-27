import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Observable } from 'rxjs';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { UserService } from '$lib/app/_services/auth/user.service';
import { NetworksService, type INetwork } from '../../_services/networks.service';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

export interface IBillingTier {
    id: string;
    name: string;
    tagline: string;
    price: string;
    pricePeriod: string;
    features: string[];
    highlight: boolean;
    ctaLabel: string;
    comingSoon: boolean;
}

export const BILLING_TIERS: IBillingTier[] = [
    {
        id: 'spark',
        name: 'Spark',
        tagline: "Free forever — no credit card, no tricks.",
        price: '$0',
        pricePeriod: '/ month',
        features: [
            '1 network',
            'Up to 3 team members',
            '10k messages / month',
            'Community support',
        ],
        highlight: false,
        ctaLabel: 'Current plan',
        comingSoon: false,
    },
    {
        id: 'surge',
        name: 'Surge',
        tagline: 'For teams that are ready to move fast.',
        price: '$49',
        pricePeriod: '/ month',
        features: [
            '5 networks',
            'Unlimited team members',
            '1M messages / month',
            'Priority email support',
            'Advanced analytics',
        ],
        highlight: true,
        ctaLabel: 'Upgrade to Surge',
        comingSoon: true,
    },
    {
        id: 'storm',
        name: 'Storm',
        tagline: 'Unlimited power for serious infrastructure.',
        price: 'Custom',
        pricePeriod: '',
        features: [
            'Unlimited networks',
            'Unlimited team members',
            'Unlimited messages',
            'Dedicated support & SLA',
            'Custom integrations',
            'On-premise option',
        ],
        highlight: false,
        ctaLabel: 'Contact sales',
        comingSoon: true,
    },
];

@Component({
    selector: 'app-billing-settings',
    imports: [
        CommonModule,
        DashboardLayoutComponent,
    ],
    templateUrl: './billing-settings.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingSettingsPageComponent implements OnInit {
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly selectedNetwork$: Observable<INetwork | null>;
    protected readonly tiers = BILLING_TIERS;

    constructor(
        private readonly networksService: NetworksService,
        private readonly _userService: UserService,
    ) {
        this.selectedNetwork$ = this.networksService.selectedNetwork$;
    }

    async ngOnInit(
    ) {
        const session = await this._userService.authClient.getSession();
        if (session.data) {
            this.userSession.set(session.data.user as UserSession);
        }
    }
}
