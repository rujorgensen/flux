import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { DashboardLayoutComponent } from '../../dashboard-layout/dashboard-layout.component';
import { ActiveChannelsTableComponent } from '../../tables/active-channels/active-channels-table.component';

interface UserSession {
	id?: string;
	name?: string;
	email?: string;
	image?: string;
}

@Component({
	selector: 'app-active-channels-page',
	imports: [
		CommonModule,
		DashboardLayoutComponent,
		ActiveChannelsTableComponent,
	],
	templateUrl: './active-channels-page.component.html',
	styleUrls: ['./active-channels-page.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
})
export class ActiveChannelsPageComponent {
	public readonly networkId = input.required<string>();
	public readonly userSession = input<UserSession | null>();
	public readonly activeNetworkName = input<string>('Network');

	static clientProviders = [provideHttpClient(
		withFetch()
	)];
	static renderProviders = [ActiveChannelsPageComponent.clientProviders];
}
