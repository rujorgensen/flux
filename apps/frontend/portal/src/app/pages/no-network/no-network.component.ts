import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { NetworksService } from '../../_services/networks.service';

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

    constructor(
        private readonly networksService: NetworksService,
        private readonly router: Router,
    ) {}

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
