import {
    ChangeDetectionStrategy,
    Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectedAuthoritiesTableComponent } from '../../components/tables/connected-authorities/connected-authorities-table.component';
import { NetworksService } from '../../_services/networks.service';

@Component({
    selector: 'app-connected-authorities',
    imports: [
        CommonModule,
        ConnectedAuthoritiesTableComponent,
    ],
    templateUrl: './connected-authorities.component.html',
    styleUrls: ['./connected-authorities.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAuthoritiesPageComponent {
    protected readonly selectedNetwork$;

    constructor(
        private readonly networksService: NetworksService,
    ) {
        this.selectedNetwork$ = this.networksService.selectedNetwork$;
    }
}
