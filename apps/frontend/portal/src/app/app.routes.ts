import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { networkGuard } from './guards/network.guard';

export const appRoutes: Route[] = [
    {
        path: 'sign-in',
        loadComponent: () => import('./pages/sign-in/sign-in.component').then(m => m.SignInPageComponent),
    },
    {
        path: 'no-network',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/no-network/no-network.component').then(m => m.NoNetworkPageComponent),
    },
    {
        path: '',
        canActivate: [authGuard, networkGuard],
        loadComponent: () => import('./pages/dashboard-home/dashboard-home.component').then(m => m.DashboardHomePageComponent),
    },
    {
        path: 'dashboard/connected-agents',
        canActivate: [authGuard, networkGuard],
        loadComponent: () => import('./pages/connected-agents/connected-agents.component').then(m => m.ConnectedAgentsPageComponent),
    },
    {
        path: 'dashboard/connected-authorities',
        canActivate: [authGuard, networkGuard],
        loadComponent: () => import('./pages/connected-authorities/connected-authorities.component').then(m => m.ConnectedAuthoritiesPageComponent),
    },
    {
        path: 'dashboard/active-channels',
        canActivate: [authGuard, networkGuard],
        loadComponent: () => import('./pages/active-channels/active-channels.component').then(m => m.ActiveChannelsPageComponent),
    },
    {
        path: 'dashboard/settings/general',
        canActivate: [authGuard, networkGuard],
        loadComponent: () => import('./pages/general-settings/general-settings.component').then(m => m.GeneralSettingsPageComponent),
    },
    {
        path: 'privacy-policy',
        loadComponent: () => import('./pages/privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyPageComponent),
    },
    {
        path: 'terms-of-service',
        loadComponent: () => import('./pages/terms-of-service/terms-of-service.component').then(m => m.TermsOfServicePageComponent),
    },
    {
        path: '**',
        redirectTo: '',
    },
];
