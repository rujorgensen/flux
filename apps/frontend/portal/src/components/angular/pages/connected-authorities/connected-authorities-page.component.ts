import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { DashboardLayoutComponent } from '../../dashboard-layout/dashboard-layout.component';
import { ConnectedAuthoritiesTableComponent } from '../../tables/connected-authorities/connected-authorities-table.component';

interface UserSession {
	id?: string;
	name?: string;
	email?: string;
	image?: string;
}

@Component({
	selector: 'app-connected-authorities-page',
	imports: [
		CommonModule,
		DashboardLayoutComponent,
		ConnectedAuthoritiesTableComponent,
	],
	templateUrl: './connected-authorities-page.component.html',
	styleUrls: ['./connected-authorities-page.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
})
export class ConnectedAuthoritiesPageComponent {
	public readonly networkId = input.required<string>();
	public readonly userSession = input<UserSession | null>();
	public readonly activeNetworkName = input<string>('Network');

	static clientProviders = [provideHttpClient(
		withFetch()
	)];
	static renderProviders = [ConnectedAuthoritiesPageComponent.clientProviders];
}
