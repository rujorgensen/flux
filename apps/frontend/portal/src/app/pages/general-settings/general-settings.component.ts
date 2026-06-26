import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Observable } from 'rxjs';
import { NetworkTokensComponent } from '../../components/network-tokens/network-tokens.component';
import { NetworksService } from '../../_services/networks.service';
import type {
    INetwork_S,
} from '@flux/shared/features/networks';

@Component({
    selector: 'app-general-settings',
    imports: [
        CommonModule,
        NetworkTokensComponent,
    ],
    templateUrl: './general-settings.component.html',
    styleUrls: ['./general-settings.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettingsPageComponent {
    protected readonly selectedNetwork$: Observable<INetwork_S | null>;

    constructor(
        private readonly networksService: NetworksService,
    ) {
        this.selectedNetwork$ = this.networksService.selectedNetwork$;
    }
}
