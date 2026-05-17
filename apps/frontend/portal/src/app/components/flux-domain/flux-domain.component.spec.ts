import { TestBed } from '@angular/core/testing';
import { FluxDomainComponent, resolveFluxDomain } from './flux-domain.component';

describe('FluxDomainComponent', () => {
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

        Object.defineProperty(navigator, 'clipboard', {
            writable: true,
            value: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
    });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FluxDomainComponent],
        }).compileComponents();
    });

    it('should create the component', () => {
        const fixture = TestBed.createComponent(FluxDomainComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('should resolve the active mesh domain for non-local portal hosts', () => {
        expect(resolveFluxDomain({
            hostname: 'persistica.io',
            origin: 'https://persistica.io',
            protocol: 'https:',
        })).toEqual({
            domain: 'https://mesh.persistica.io',
            isVisible: true,
        });

        expect(resolveFluxDomain({
            hostname: 'portal.persistica.io',
            origin: 'https://portal.persistica.io',
            protocol: 'https:',
        })).toEqual({
            domain: 'https://mesh.persistica.io',
            isVisible: true,
        });
    });

    it('should hide the server domain when the portal already runs on the mesh host', () => {
        expect(resolveFluxDomain({
            hostname: 'mesh.persistica.io',
            origin: 'https://mesh.persistica.io',
            protocol: 'https:',
        })).toEqual({
            domain: 'https://mesh.persistica.io',
            isVisible: false,
        });
    });

    it('should copy domain to clipboard and show "Copied!" state on click', async () => {
        const fixture = TestBed.createComponent(FluxDomainComponent);
        fixture.detectChanges();

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
        button.click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:5100');
        expect(button.textContent?.trim()).toContain('Copied!');
    });
});
