import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'formatDate',
    standalone: true,
})
export class FormatDatePipe implements PipeTransform {
    transform(
        date: Date,
    ): string {
        const formatted = date.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        return formatted;
    }
}
