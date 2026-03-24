import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-terms-of-service-page',
	imports: [CommonModule],
	templateUrl: './terms-of-service-page.component.html',
	styleUrls: ['./terms-of-service-page.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
})
export class TermsOfServicePageComponent {}
