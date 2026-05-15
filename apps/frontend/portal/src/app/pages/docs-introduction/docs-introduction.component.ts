import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { UserService } from '$lib/app/_services/auth/user.service';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-docs-introduction',
    imports: [
        CommonModule,
        RouterLink,
        DashboardLayoutComponent,
    ],
    templateUrl: './docs-introduction.component.html',
    styleUrls: ['./docs-introduction.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsIntroductionPageComponent implements OnInit {
    protected readonly userSession = signal<UserSession | null>(null);

    constructor(
        private readonly _userService: UserService,
    ) {}

    async ngOnInit(

    ): Promise<void> {
        const session = await this._userService.authClient.getSession();
        if (session.data) {
            this.userSession.set(session.data.user as UserSession);
        }
    }
}
