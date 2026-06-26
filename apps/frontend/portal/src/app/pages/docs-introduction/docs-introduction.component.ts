import {
    ChangeDetectionStrategy,
    Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-docs-introduction',
    imports: [
        CommonModule,
        RouterLink,
    ],
    templateUrl: './docs-introduction.component.html',
    styleUrls: ['./docs-introduction.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsIntroductionPageComponent {
}
