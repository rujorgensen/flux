import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createAuthClient } from 'better-auth/client';

@Component({
    selector: 'app-login-form',
    standalone: true,
    templateUrl: './login-form.component.html',
    styleUrl: './login-form.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
    private authClient = createAuthClient({
        baseURL: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : undefined,
    });

    googleSignIn(): void {
        const callbackURL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:3001'
            : '/';

        this.authClient.signIn.social(
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
