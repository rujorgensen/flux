import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ConfirmButtonComponent } from './confirm-button.component';

describe('ConfirmButtonComponent', () => {
    let fixture: ComponentFixture<ConfirmButtonComponent>;
    let button: HTMLButtonElement;
    let confirmed: number;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ConfirmButtonComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ConfirmButtonComponent);
        fixture.componentRef.setInput('label', 'Kick');
        fixture.componentRef.setInput('armedLabel', 'Kick authority?');
        fixture.componentRef.setInput('ariaLabel', 'Kick authority a1');
        fixture.componentRef.setInput('variant', 'ghost');

        confirmed = 0;
        fixture.componentInstance.confirmed.subscribe(() => confirmed++);

        fixture.detectChanges();
        button = fixture.nativeElement.querySelector('button');
    });

    it('arms on the first click and does not perform', () => {
        button.click();
        fixture.detectChanges();

        expect(confirmed).toBe(0);
        expect(button.classList.contains('armed')).toBe(true);
        expect(button.getAttribute('aria-label')).toBe('Kick authority?');
    });

    it('performs on the second click', () => {
        button.click();
        fixture.detectChanges();
        button.click();
        fixture.detectChanges();

        expect(confirmed).toBe(1);
        expect(button.classList.contains('armed')).toBe(false);
    });

    it('disarms on Escape, so the next click arms again', () => {
        button.click();
        fixture.detectChanges();
        button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        fixture.detectChanges();
        button.click();
        fixture.detectChanges();

        expect(confirmed).toBe(0);
        expect(button.classList.contains('armed')).toBe(true);
    });
});
