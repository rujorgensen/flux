import { Injectable } from '@angular/core';
import { createAuthClient } from 'better-auth/client';
import { apiBaseUrl } from '../api/api-base';

@Injectable({
    providedIn: 'root',
})
export class UserService {
    public readonly authClient = createAuthClient({
        baseURL: apiBaseUrl,
    });
}
