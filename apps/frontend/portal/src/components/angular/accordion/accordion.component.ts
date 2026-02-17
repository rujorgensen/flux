import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface AccordionItem {
    id: string;
    title: string;
    description: string;
}

@Component({
    selector: 'app-accordion',
    standalone: true,
    templateUrl: './accordion.component.html',
    styleUrl: './accordion.component.css',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionComponent {
    protected readonly items: AccordionItem[] = [
        {
            id: 'item-1',
            title: 'Is it accessible?',
            description: 'Yes. It adheres to the WAI-ARIA design pattern.',
        },
        {
            id: 'item-2',
            title: 'Is it unstyled?',
            description:
                "Yes. It's unstyled by default, giving you freedom over the look and feel.",
        },
        {
            id: 'item-3',
            title: 'Can it be animated?',
            description:
                'Yes! You can use the transition prop to configure the animation.',
        },
    ];

    protected selectedId = signal<string | null>(null);

    toggleItem(
        id: string,
    ) {
        this.selectedId.update((current) => (current === id ? null : id));
    }

    isSelected(
        id: string,
    ): boolean {
        return this.selectedId() === id;
    }
}
