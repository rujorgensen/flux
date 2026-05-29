import { TestBed } from '@angular/core/testing';
import { NetworkIdComponent } from './network-id.component';

describe('NetworkIdComponent', () => {
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
            imports: [NetworkIdComponent],
        }).compileComponents();
    });

    it('should create the component', () => {
        const fixture = TestBed.createComponent(NetworkIdComponent);
        fixture.componentRef.setInput('networkId', 'test-network-id');
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('should display the network ID in the input', () => {
        const fixture = TestBed.createComponent(NetworkIdComponent);
        fixture.componentRef.setInput('networkId', 'abc123xyz');
        fixture.detectChanges();

        const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
        expect(input.value).toBe('abc123xyz');
    });

    it('should copy network ID to clipboard and show "Copied!" state on click', async () => {
        const fixture = TestBed.createComponent(NetworkIdComponent);
        fixture.componentRef.setInput('networkId', 'my-network-id');
        fixture.detectChanges();

        const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
        button.click();
        await fixture.whenStable();
        fixture.detectChanges();

        // oxlint-disable-next-line typescript/unbound-method
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('my-network-id');
        expect(button.textContent.trim()).toContain('Copied!');
    });
});
