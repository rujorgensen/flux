import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { App } from './app.component';
import { version } from '../../package.json';

describe('App', () => {
    beforeAll(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [App, RouterModule.forRoot([])],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('should log the app version on init', () => {
        const consoleSpy = vi.spyOn(console, 'log');
        const fixture = TestBed.createComponent(App);
        fixture.detectChanges();
        expect(consoleSpy).toHaveBeenCalledWith(`Portal UI v${version}`);
        consoleSpy.mockRestore();
    });
});
