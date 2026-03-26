import { Injectable } from '@angular/core';
import { createAuthClient } from 'better-auth/client';

@Injectable({
    providedIn: 'root',
})
export class UserService {
    public readonly authClient = createAuthClient({
        baseURL: typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : undefined,
    });
}
