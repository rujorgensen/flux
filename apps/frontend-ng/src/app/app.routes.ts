import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const appRoutes: Route[] = [
    {
        path: 'sign-in',
        loadComponent: () => import('./pages/sign-in/sign-in-page.component').then(m => m.SignInPageComponent),
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/dashboard-home/dashboard-home-page.component').then(m => m.DashboardHomePageComponent),
    },
    {
        path: 'dashboard/connected-agents',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/connected-agents/connected-agents-page.component').then(m => m.ConnectedAgentsPageComponent),
    },
    {
        path: 'dashboard/connected-authorities',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/connected-authorities/connected-authorities-page.component').then(m => m.ConnectedAuthoritiesPageComponent),
    },
    {
        path: 'dashboard/active-channels',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/active-channels/active-channels-page.component').then(m => m.ActiveChannelsPageComponent),
    },
    {
        path: 'privacy-policy',
        loadComponent: () => import('./pages/privacy-policy/privacy-policy-page.component').then(m => m.PrivacyPolicyPageComponent),
    },
    {
        path: 'terms-of-service',
        loadComponent: () => import('./pages/terms-of-service/terms-of-service-page.component').then(m => m.TermsOfServicePageComponent),
    },
    {
        path: '**',
        redirectTo: '',
    },
];
