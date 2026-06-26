import {
    ChangeDetectionStrategy,
    Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectedAgentsTableComponent } from '../../components/tables/connected-agents/connected-agents-table.component';
import { NetworksService } from '../../_services/networks.service';

@Component({
    selector: 'app-connected-agents',
    imports: [
        CommonModule,
        ConnectedAgentsTableComponent,
    ],
    templateUrl: './connected-agents.component.html',
    styleUrls: ['./connected-agents.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAgentsPageComponent {
    protected readonly selectedNetwork$;

    constructor(
        private readonly networksService: NetworksService,
    ) {
        this.selectedNetwork$ = this.networksService.selectedNetwork$;
    }
}
