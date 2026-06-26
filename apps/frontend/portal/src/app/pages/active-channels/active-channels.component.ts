import {
    ChangeDetectionStrategy,
    Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveChannelsTableComponent } from '../../components/tables/active-channels/active-channels-table.component';
import { NetworksService } from '$lib/app/_services/networks.service';

@Component({
    selector: 'app-active-channels',
    imports: [
        CommonModule,
        ActiveChannelsTableComponent,
    ],
    templateUrl: './active-channels.component.html',
    styleUrls: ['./active-channels.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveChannelsPageComponent {
    protected readonly selectedNetwork$;

    constructor(
        private readonly networksService: NetworksService,
    ) {
        this.selectedNetwork$ = this.networksService.selectedNetwork$;
    }
}
