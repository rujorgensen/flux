import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-dashboard-layout',
    templateUrl: './dashboard-layout.component.html',
    styleUrl: './dashboard-layout.component.scss',
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutComponent {
    userSession = input<UserSession | null>();
    activeNetworkName = input<string>('Network');
}
