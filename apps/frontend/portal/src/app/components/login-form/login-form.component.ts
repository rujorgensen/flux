import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { UserService } from '$lib/app/_services/auth/user.service';
import { api } from '../../_services/api/api';

type AuthMode = 'loading' | 'google' | 'master-password' | 'error';

@Component({
    selector: 'app-login-form',
    imports: [FormsModule],
    templateUrl: './login-form.component.html',
    styleUrl: './login-form.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
    protected readonly authMode = signal<AuthMode>('loading');
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly masterPassword = signal<string>('');
    protected readonly masterPasswordAdminEmail = signal<string | null>(null);

    constructor(
        private readonly _userService: UserService,
    ) {
        void this.loadAuthConfig();
    }

    protected googleSignIn(

    ): void {
        const callbackURL = this.getCallbackURL();

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
                        toast.error(ctx.error.message);
                    },
                },
            );
    }

    protected signInWithMasterPassword(

    ): void {
        const password = this.masterPassword();
        const adminEmail = this.masterPasswordAdminEmail();

        if (!adminEmail) {
            toast.error('Master password sign-in is not available.');
            return;
        }

        if (password.length === 0) {
            toast.error('Enter the master password.');
            return;
        }

        this.isSubmitting.set(true);

        this._userService
            .authClient
            .signIn
            .email(
                {
                    email: adminEmail,
                    password,
                    callbackURL: this.getCallbackURL(),
                    rememberMe: true,
                },
                {
                    onSuccess: () => {
                        this.isSubmitting.set(false);
                    },
                    onError: (ctx) => {
                        this.isSubmitting.set(false);
                        console.error('Master password sign-in error:', ctx.error.message);
                        toast.error(ctx.error.message);
                    },
                },
            );
    }

    protected retryLoadAuthConfig(

    ): void {
        void this.loadAuthConfig();
    }

    private async loadAuthConfig(

    ): Promise<void> {
        this.authMode.set('loading');

        try {
            const response = await api.api.auth.config.get();
            if (!response.data) {
                throw new Error('Auth config response did not include data.');
            }

            this.masterPasswordAdminEmail.set(response.data.masterPasswordAdminEmail);
            this.authMode.set(
                response.data.isMasterPasswordLoginEnabled
                    ? 'master-password'
                    : 'google',
            );
        } catch (error: unknown) {
            console.error('Failed to load auth config:', error);
            this.authMode.set('error');
        }
    }

    private getCallbackURL(

    ): string {
        return typeof window !== 'undefined'
            ? window.location.origin
            : '/';
    }
}
