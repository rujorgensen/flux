import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-terms-of-service',
	imports: [CommonModule],
	templateUrl: './terms-of-service.component.html',
	styleUrls: ['./terms-of-service.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsOfServicePageComponent {}
