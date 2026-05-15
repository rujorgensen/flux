import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-privacy-policy',
	imports: [CommonModule],
    templateUrl: './privacy-policy.component.html',
    styleUrls: ['./privacy-policy.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyPageComponent {}
