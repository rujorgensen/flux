import { Route } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { networkGuard } from './guards/network.guard';
import { DashboardLayoutComponent } from './components/dashboard-layout/dashboard-layout.component';

export const appRoutes: Route[] = [
    {
        path: 'sign-in',
        loadComponent: () => import('./pages/sign-in/sign-in.component').then(m => m.SignInPageComponent),
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
        // Persistent shell: the layout (sidebar, header, avatar) stays mounted
        // while only the routed child content swaps on navigation.
        path: '',
        component: DashboardLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                canActivate: [networkGuard],
                loadComponent: () => import('./pages/dashboard-home/dashboard-home.component').then(m => m.DashboardHomePageComponent),
            },
            {
                path: 'no-network',
                loadComponent: () => import('./pages/no-network/no-network.component').then(m => m.NoNetworkPageComponent),
            },
            {
                path: 'dashboard',
                canActivate: [networkGuard],
                children: [
                    {
                        path: 'connected-agents',
                        loadComponent: () => import('./pages/connected-agents/connected-agents.component').then(m => m.ConnectedAgentsPageComponent),
                    },
                    {
                        path: 'connected-authorities',
                        loadComponent: () => import('./pages/connected-authorities/connected-authorities.component').then(m => m.ConnectedAuthoritiesPageComponent),
                    },
                    {
                        path: 'active-channels',
                        loadComponent: () => import('./pages/active-channels/active-channels.component').then(m => m.ActiveChannelsPageComponent),
                    },
                ],
            },
            {
                path: 'docs',
                children: [
                    {
                        path: 'introduction',
                        data: { title: 'Introduction' },
                        loadComponent: () => import('./pages/docs-introduction/docs-introduction.component').then(m => m.DocsIntroductionPageComponent),
                    },
                    {
                        path: 'get-started',
                        data: { title: 'Get Started' },
                        loadComponent: () => import('./pages/docs-get-started/docs-get-started.component').then(m => m.DocsGetStartedPageComponent),
                    },
                    {
                        path: 'tutorials',
                        data: { title: 'Tutorials' },
                        loadComponent: () => import('./pages/docs-tutorials/docs-tutorials.component').then(m => m.DocsTutorialsPageComponent),
                    },
                    {
                        path: 'changelog',
                        data: { title: 'Changelog' },
                        loadComponent: () => import('./pages/docs-changelog/docs-changelog.component').then(m => m.DocsChangelogPageComponent),
                    },
                ],
            },
            {
                path: 'settings',
                canActivate: [networkGuard],
                children: [
                    {
                        path: 'general',
                        pathMatch: 'full',
                        redirectTo: 'tokens',
                    },
                    {
                        path: 'tokens',
                        data: { title: 'Access Tokens' },
                        loadComponent: () => import('./pages/general-settings/general-settings.component').then(m => m.GeneralSettingsPageComponent),
                    },
                    {
                        path: 'team',
                        data: { title: 'Team' },
                        loadComponent: () => import('./pages/team-settings/team-settings.component').then(m => m.TeamSettingsPageComponent),
                    },
                    {
                        path: 'billing',
                        data: { title: 'Billing' },
                        loadComponent: () => import('./pages/billing-settings/billing-settings.component').then(m => m.BillingSettingsPageComponent),
                    },
                ],
            },
            {
                path: 'admin',
                children: [
                    {
                        path: 'dragonfly',
                        data: { title: 'DragonFly Status' },
                        loadComponent: () => import('./pages/dragonfly-info/dragonfly-info.component').then(m => m.DragonflyInfoPageComponent),
                    },
                ],
            },
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
];
