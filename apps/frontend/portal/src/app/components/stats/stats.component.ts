import { Component, ChangeDetectionStrategy } from '@angular/core';
import type {
    TNetworkChannelCountAt,
} from '@flux/shared/types';
import { TotalDataUsageComponent } from './panes/total-data-usage/total-data-usage.component';
import { ConnectedAuthoritiesComponent } from './panes/connected-authorities/connected-authorities.component';
import { ConnectedAgentsComponent } from './panes/connected-agents/connected-agents.component';
import { ActiveChannelsComponent } from './panes/active-channels/active-channels.component';
import { NetworkStatsService } from '$lib/app/_services/sidebar-counts/sidebar-counts.service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'app-stats',
    imports: [
        // * Pipes
        AsyncPipe,
        // * Components
        TotalDataUsageComponent,
        ConnectedAuthoritiesComponent,
        ConnectedAgentsComponent,
        ActiveChannelsComponent,
    ],
    styleUrl: './stats.component.scss',
    templateUrl: './stats.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsComponent {
    protected readonly totalDataUsage$$: Observable<number>;

    protected readonly agentCount$$: Observable<TNetworkChannelCountAt>;
    protected readonly authorityCount$$: Observable<TNetworkChannelCountAt>;
    protected readonly channelCount$$: Observable<TNetworkChannelCountAt>;

    constructor(
        networkStatsService: NetworkStatsService,
    ) {
        this.totalDataUsage$$ = networkStatsService.totalDataUsage$$;
        this.agentCount$$ = networkStatsService.agentCount$$;
        this.authorityCount$$ = networkStatsService.authorityCount$$;
        this.channelCount$$ = networkStatsService.channelCount$$;
    }
}
