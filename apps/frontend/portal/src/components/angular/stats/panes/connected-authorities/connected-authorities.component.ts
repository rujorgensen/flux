import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { TNetworkAuthorityCountAt } from '@flux/shared/types';

@Component({
    selector: 'app-connected-authorities',
    templateUrl: './connected-authorities.component.html',
    styleUrls: ['./connected-authorities.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAuthoritiesComponent {
    connectedAuthoritiesCount = input.required<TNetworkAuthorityCountAt>();
}
