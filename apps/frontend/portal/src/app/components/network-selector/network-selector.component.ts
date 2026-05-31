import {
    ChangeDetectionStrategy,
    Component,
    output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, map } from 'rxjs';
import { NetworksService } from '../../_services/networks.service';
import type { INetwork_S } from '@flux/shared/features/networks';

@Component({
    selector: 'app-network-selector',
    imports: [
        CommonModule,
    ],
    templateUrl: './network-selector.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkSelectorComponent {
    readonly createRequested = output();
    readonly deleteRequested = output<INetwork_S>();

    protected readonly vm$;

    constructor(
        protected readonly networksService: NetworksService,
    ) {
        this.vm$ = combineLatest({
            networks: this.networksService.networks$,
            selectedNetwork: this.networksService.selectedNetwork$,
            isLoading: this.networksService.isLoading$,
            canCreateNetwork: this.networksService.canCreateNetwork$,
        }).pipe(
            map((vm) => ({ ...vm, hasNetworks: vm.networks.length > 0 })),
        );
    }

    protected selectNetwork(
        network: INetwork_S,
    ): void {
        this.networksService.selectNetwork(network);
    }

    protected requestCreate(

    ): void {
        this.createRequested.emit();
    }

    protected requestDelete(
        network: INetwork_S,
        event: Event,
    ): void {
        event.stopPropagation();
        this.deleteRequested.emit(network);
    }
}
