import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UserService } from '$lib/app/_services/auth/user.service';

@Component({
    selector: 'app-login-form',
    templateUrl: './login-form.component.html',
    styleUrl: './login-form.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {

    constructor(
        private readonly _userService: UserService,
    ) { }

    protected googleSignIn(

    ): void {
        const callbackURL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:3001'
            : '/';

        this._userService
            .authClient
            .signIn
            .social(
                {
                    provider: 'google',
                    callbackURL,
                },
                {
                    onSuccess: () => {
                        console.log('Google sign-in successful');
                    },
                    onError: (ctx) => {
                        console.error('Google sign-in error:', ctx.error.message);
                        // TODO: Replace alert with a modern notification system (e.g., toast)
                        alert(ctx.error.message);
                    },
                },
            );
    }
}
