import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { DashboardLayoutComponent } from '../../dashboard-layout/dashboard-layout.component';
import { ConnectedAgentsTableComponent } from '../../tables/connected-agents/connected-agents-table.component';

interface UserSession {
	id?: string;
	name?: string;
	email?: string;
	image?: string;
}

@Component({
	selector: 'app-connected-agents-page',
	imports: [
		CommonModule,
		DashboardLayoutComponent,
		ConnectedAgentsTableComponent,
	],
	templateUrl: './connected-agents-page.component.html',
	styleUrls: ['./connected-agents-page.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
})
export class ConnectedAgentsPageComponent {
	public readonly networkId = input.required<string>();
	public readonly userSession = input<UserSession | null>();
	public readonly activeNetworkName = input<string>('Network');

	static clientProviders = [provideHttpClient(
		withFetch()
	)];
	static renderProviders = [ConnectedAgentsPageComponent.clientProviders];
}
