import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { DashboardLayoutComponent } from '../../dashboard-layout/dashboard-layout.component';
import { StatsComponent } from '../../stats/stats.component';
import { DashboardComponent } from '../../dashboard/dashboard.component';
import { ChartComponent } from '../../chart/chart.component';

interface UserSession {
	id?: string;
	name?: string;
	email?: string;
	image?: string;
}

@Component({
	selector: 'app-dashboard-home-page',
	imports: [
		CommonModule,
		DashboardLayoutComponent,
		StatsComponent,
		DashboardComponent,
		ChartComponent,
	],
	templateUrl: './dashboard-home-page.component.html',
	styleUrls: ['./dashboard-home-page.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
})
export class DashboardHomePageComponent {
	public readonly networkId = input.required<string>();
	public readonly networkCode = input.required<string>();
	public readonly userSession = input<UserSession | null>();
	public readonly activeNetworkName = input<string>('Network');

	static clientProviders = [provideHttpClient(
		withFetch()
	)];
	static renderProviders = [DashboardHomePageComponent.clientProviders];
}
