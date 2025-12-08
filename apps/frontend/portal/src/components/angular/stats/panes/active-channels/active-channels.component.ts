import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { TNetworkChannelCountAt } from '@flux/shared/types';

@Component({
    selector: 'app-active-channels',
    templateUrl: './active-channels.component.html',
    styleUrls: ['./active-channels.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveChannelsComponent {
    public readonly activeChannelCount = input.required<TNetworkChannelCountAt>();
}
