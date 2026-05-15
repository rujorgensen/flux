import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { TNetworkChannelCountAt } from '@flux/shared/types';

@Component({
    selector: 'app-active-channels',
    templateUrl: './active-channels.component.html',
    styleUrls: ['./active-channels.component.css'],
    imports: [DatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveChannelsComponent {
    public readonly activeChannelCount = input.required<TNetworkChannelCountAt>();
}
