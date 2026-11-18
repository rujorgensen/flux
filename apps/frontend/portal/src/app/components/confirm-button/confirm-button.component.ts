import {
    ChangeDetectionStrategy,
    Component,
    type ElementRef,
    type OnDestroy,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';

const DISARM_AFTER_MS = 4_000;
const RESIZE_MS = 180;

/**
 * A destructive button that confirms in place: the first click arms it (the label
 * swaps and the button grows over its neighbour), the second click performs.
 * It disarms after 4 s, on Escape and on blur.
 * See `docs/guides/ui-ux/destructive-actions.md` in the private repo.
 */
@Component({
    selector: 'app-confirm-button',
    template: `
        <span #anchor class="anchor">
            <button
                #button
                type="button"
                class="btn btn-sm grow"
                [class.btn-ghost]="variant() === 'ghost'"
                [class.btn-outline]="variant() === 'outline'"
                [class.armed]="armed()"
                [disabled]="busy() || disabled()"
                [attr.aria-label]="armed() ? armedLabel() : ariaLabel()"
                (click)="onClick()"
                (blur)="disarm()"
                (keydown.escape)="disarm()"
            >
                <span class="l0">
                    @if (busy()) {
                        <span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
                    }
                    {{ label() }}
                </span>
                <span #armedText class="l1">{{ armedLabel() }}</span>
            </button>
        </span>
    `,
    styleUrl: './confirm-button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.armed]': 'armed()',
    },
})
export class ConfirmButtonComponent implements OnDestroy {
    public readonly label = input.required<string>();
    public readonly armedLabel = input.required<string>();
    /** `ghost` when repeated per row, `outline` when standalone. */
    public readonly variant = input.required<'ghost' | 'outline'>();
    public readonly ariaLabel = input.required<string>();
    public readonly busy = input<boolean>(false);
    public readonly disabled = input<boolean>(false);

    public readonly confirmed = output<void>();

    protected readonly armed = signal<boolean>(false);

    // Size and lift are written straight to the DOM: the width transition needs the
    // rest width committed before the armed width, in the same task.
    private readonly _anchor = viewChild.required<ElementRef<HTMLElement>>('anchor');
    private readonly _button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
    private readonly _armedText = viewChild.required<ElementRef<HTMLElement>>('armedText');

    private _restWidth: number = 0;
    private _disarmTimer: ReturnType<typeof setTimeout> | undefined;
    private _settleTimer: ReturnType<typeof setTimeout> | undefined;

    public ngOnDestroy(): void {
        clearTimeout(this._disarmTimer);
        clearTimeout(this._settleTimer);
    }

    protected onClick(): void {
        if (this.armed()) {
            this.disarm();
            this.confirmed.emit();
            return;
        }

        this.arm();
    }

    protected disarm(): void {
        if (!this.armed()) {
            return;
        }

        clearTimeout(this._disarmTimer);
        this.armed.set(false);

        const button: HTMLButtonElement = this._button().nativeElement;
        button.style.width = `${this._restWidth}px`;

        // Back in the flow once the shrink has played.
        clearTimeout(this._settleTimer);
        this._settleTimer = setTimeout(() => {
            const anchor: HTMLElement = this._anchor().nativeElement;
            anchor.style.width = '';
            anchor.style.height = '';
            button.style.width = '';
            button.classList.remove('lifted');
        }, RESIZE_MS);
    }

    private arm(): void {
        clearTimeout(this._settleTimer);

        const anchor: HTMLElement = this._anchor().nativeElement;
        const button: HTMLButtonElement = this._button().nativeElement;

        if (!button.classList.contains('lifted')) {
            this._restWidth = button.offsetWidth;
            anchor.style.width = `${this._restWidth}px`;
            anchor.style.height = `${button.offsetHeight}px`;
            button.style.width = `${this._restWidth}px`;
            button.classList.add('lifted');
        }

        const style: CSSStyleDeclaration = getComputedStyle(button);
        const chrome: number = Number.parseFloat(style.paddingInlineStart)
            + Number.parseFloat(style.paddingInlineEnd)
            + Number.parseFloat(style.borderInlineStartWidth)
            + Number.parseFloat(style.borderInlineEndWidth);
        const armedWidth: number = Math.ceil(this._armedText().nativeElement.offsetWidth + chrome);

        // Commit the rest width, so the change to the armed width transitions.
        void button.offsetWidth;
        button.style.width = `${Math.max(armedWidth, this._restWidth)}px`;
        this.armed.set(true);

        // Safari does not focus a clicked button; blur must disarm.
        button.focus();

        this._disarmTimer = setTimeout(() => this.disarm(), DISARM_AFTER_MS);
    }
}
