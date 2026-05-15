import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { TNetworkAuthorityCountAt } from '@flux/shared/types';

@Component({
    selector: 'app-connected-authorities',
    templateUrl: './connected-authorities.component.html',
    styleUrls: ['./connected-authorities.component.css'],
    imports: [DatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAuthoritiesComponent {
    public readonly connectedAuthoritiesCount = input.required<TNetworkAuthorityCountAt>();
}
