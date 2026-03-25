import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
    selector: 'app-total-data-usage',
    templateUrl: './total-data-usage.component.html',
    styleUrls: ['./total-data-usage.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TotalDataUsageComponent {
    public readonly totalDataUsage = input.required<number>();
}
