import {
    Component,
    signal,
    ChangeDetectionStrategy,
    OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-api-call',
    standalone: true,
    templateUrl: './api-call.component.html',
    styleUrl: './api-call.component.css',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiCallComponent implements OnInit {
    protected data = signal<string | null>(null);
    protected error = signal<string | null>(null);
    protected loading = signal(true);

    ngOnInit() {
        this.fetchData();
    }

    private async fetchData() {
        try {
            const response = await fetch('api/ping');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const text = await response.text();
            this.data.set(text);
            this.loading.set(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            this.error.set(errorMessage);
            this.loading.set(false);
        }
    }
}
