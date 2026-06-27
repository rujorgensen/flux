import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription, filter } from 'rxjs';
import { NetworksService, MAX_NETWORKS } from '../../_services/networks.service';
import { InstanceService } from '../../_services/instance.service';

@Component({
    selector: 'app-no-network',
    imports: [
        CommonModule,
    ],
    templateUrl: './no-network.component.html',
    styleUrls: ['./no-network.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoNetworkPageComponent implements OnInit, OnDestroy {
    private networkSubscription?: Subscription;

    protected readonly MAX_NETWORKS = MAX_NETWORKS;
    protected readonly selfHosted;

    constructor(
        private readonly networksService: NetworksService,
        private readonly instanceService: InstanceService,
        private readonly router: Router,
    ) {
        this.selfHosted = toSignal(this.instanceService.selfHosted$, { initialValue: false });
    }

    public ngOnInit(
    ): void {
        // Redirect to dashboard as soon as a network becomes selected
        this.networkSubscription = this.networksService.selectedNetwork$.pipe(
            filter((network) => network !== null),
        )
            .subscribe({
                next: () => {
                    void this.router.navigate(['/']);
                },
            });
    }

    public ngOnDestroy(
    ): void {
        this.networkSubscription?.unsubscribe();
    }
}
