import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { TNetworkAgentCountAt } from '@flux/shared/types';

@Component({
    selector: 'app-connected-agents',
    templateUrl: './connected-agents.component.html',
    styleUrls: ['./connected-agents.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAgentsComponent {
    public readonly activeAgentCount = input.required<TNetworkAgentCountAt>();
}
