import { TestBed } from '@angular/core/testing';
import { FluxDomainComponent } from './flux-domain.component';

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

    it('should display window.location.origin as the domain', () => {
        const fixture = TestBed.createComponent(FluxDomainComponent);
        fixture.detectChanges();

        const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
        expect(input.value).toBe(window.location.origin);
    });

    it('should copy domain to clipboard and show "Copied!" state on click', async () => {
        const fixture = TestBed.createComponent(FluxDomainComponent);
        fixture.detectChanges();

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
        button.click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.origin);
        expect(button.textContent?.trim()).toContain('Copied!');
    });
});
