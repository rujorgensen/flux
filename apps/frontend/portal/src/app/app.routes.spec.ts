import { appRoutes } from './app.routes';

// The authenticated pages live under a persistent layout shell route (path '')
// that hosts them as children via a <router-outlet>.
const layoutRoute = appRoutes.find((route) => route.path === '' && !!route.children);
const settingsRoute = layoutRoute?.children?.find((route) => route.path === 'settings');

describe('appRoutes', () => {
    it('should redirect the old general settings path to access tokens', () => {
        const generalRoute = settingsRoute?.children?.find((route) => route.path === 'general');

        expect(generalRoute).toEqual(expect.objectContaining({
            path: 'general',
            pathMatch: 'full',
            redirectTo: 'tokens',
        }));
    });

    it('should expose the renamed access tokens settings route', () => {
        const tokensRoute = settingsRoute?.children?.find((route) => route.path === 'tokens');

        expect(tokensRoute?.loadComponent).toBeTypeOf('function');
    });
});
