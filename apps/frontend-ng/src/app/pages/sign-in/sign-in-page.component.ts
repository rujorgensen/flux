import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LoginFormComponent } from '../../components/login-form/login-form.component';

@Component({
    selector: 'app-sign-in-page',
    imports: [LoginFormComponent],
    templateUrl: './sign-in-page.component.html',
    styleUrls: ['./sign-in-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
})
export class SignInPageComponent {}
