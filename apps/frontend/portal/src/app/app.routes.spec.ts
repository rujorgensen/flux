import { appRoutes } from './app.routes';

describe('appRoutes', () => {
    it('should redirect the old general settings path to access tokens', () => {
        const settingsRoute = appRoutes.find((route) => route.path === 'settings');
        const generalRoute = settingsRoute?.children?.find((route) => route.path === 'general');

        expect(generalRoute).toEqual(expect.objectContaining({
            path: 'general',
            pathMatch: 'full',
            redirectTo: 'tokens',
        }));
    });

    it('should expose the renamed access tokens settings route', () => {
        const settingsRoute = appRoutes.find((route) => route.path === 'settings');
        const tokensRoute = settingsRoute?.children?.find((route) => route.path === 'tokens');

        expect(tokensRoute?.loadComponent).toBeTypeOf('function');
    });
});
