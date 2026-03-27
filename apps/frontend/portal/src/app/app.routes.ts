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
        path: 'dashboard',
        canActivate: [authGuard, networkGuard],
        children: [
            {
                path: 'connected-agents',
                canActivate: [authGuard, networkGuard],
                loadComponent: () => import('./pages/connected-agents/connected-agents.component').then(m => m.ConnectedAgentsPageComponent),
            },
            {
                path: 'connected-authorities',
                canActivate: [authGuard, networkGuard],
                loadComponent: () => import('./pages/connected-authorities/connected-authorities.component').then(m => m.ConnectedAuthoritiesPageComponent),
            },
            {
                path: 'active-channels',
                canActivate: [authGuard, networkGuard],
                loadComponent: () => import('./pages/active-channels/active-channels.component').then(m => m.ActiveChannelsPageComponent),
            },
        ],
    },
    {
        path: 'docs',
        canActivate: [authGuard],
        children: [
            {
                path: 'introduction',
                loadComponent: () => import('./pages/docs-introduction/docs-introduction.component').then(m => m.DocsIntroductionPageComponent),
            },
            {
                path: 'get-started',
                canActivate: [authGuard],
                loadComponent: () => import('./pages/docs-get-started/docs-get-started.component').then(m => m.DocsGetStartedPageComponent),
            },
            {
                path: 'tutorials',
                canActivate: [authGuard],
                loadComponent: () => import('./pages/docs-tutorials/docs-tutorials.component').then(m => m.DocsTutorialsPageComponent),
            },
            {
                path: 'changelog',
                canActivate: [authGuard],
                loadComponent: () => import('./pages/docs-changelog/docs-changelog.component').then(m => m.DocsChangelogPageComponent),
            },
        ],
    },
    {
        path: 'settings',
        canActivate: [authGuard, networkGuard],
        children: [
            {
                path: 'general',
                canActivate: [authGuard, networkGuard],
                loadComponent: () => import('./pages/general-settings/general-settings.component').then(m => m.GeneralSettingsPageComponent),
            },
            {
                path: 'team',
                loadComponent: () => import('./pages/team-settings/team-settings.component').then(m => m.TeamSettingsPageComponent),
            },
            {
                path: 'billing',
                canActivate: [authGuard, networkGuard],
                loadComponent: () => import('./pages/billing-settings/billing-settings.component').then(m => m.BillingSettingsPageComponent),
            },
        ],
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
