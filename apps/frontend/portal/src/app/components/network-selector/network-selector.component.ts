import {
    ChangeDetectionStrategy,
    Component,
    output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, map } from 'rxjs';
import { NetworksService, INetwork } from '../../_services/networks.service';

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
    readonly deleteRequested = output<INetwork>();

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
        network: INetwork,
    ): void {
        this.networksService.selectNetwork(network);
    }

    protected requestCreate(

    ): void {
        this.createRequested.emit();
    }

    protected requestDelete(
        network: INetwork,
        event: Event,
    ): void {
        event.stopPropagation();
        this.deleteRequested.emit(network);
    }
}
