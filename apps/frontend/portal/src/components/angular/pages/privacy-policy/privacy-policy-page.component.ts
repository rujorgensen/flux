import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-privacy-policy-page',
	imports: [CommonModule],
	templateUrl: './privacy-policy-page.component.html',
	styleUrls: ['./privacy-policy-page.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: true,
})
export class PrivacyPolicyPageComponent {}
