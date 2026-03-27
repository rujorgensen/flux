import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    OnInit,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardLayoutComponent } from '../../components/dashboard-layout/dashboard-layout.component';
import { UserService } from '$lib/app/_services/auth/user.service';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-docs-get-started',
    imports: [
        CommonModule,
        RouterModule,
        DashboardLayoutComponent,
    ],
    templateUrl: './docs-get-started.component.html',
    styleUrls: ['./docs-get-started.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsGetStartedPageComponent implements OnInit, AfterViewInit {
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly copiedSnippet = signal<string | null>(null);

    protected readonly meshSnippet = `import { FluxMeshServer } from '@persistica/flux-mesh';

const server = new FluxMeshServer();

server.onReady(() => {
    console.log('🚀 Mesh server running on port 5100');
});`;

    protected readonly authoritySnippet = `import { FluxAuthority } from '@persistica/flux-authority';

const NETWORK_ID = 'your-network-id';
const AUTHORIZATION_KEY = 'your-network-authorization-key';

const authority = new FluxAuthority(NETWORK_ID);

await authority.registerAuthority(
    AUTHORIZATION_KEY,

    // Validate network access
    async (auth: unknown) => {
        if (!isValidToken(auth)) {
            throw new Error('Access denied');
        }
        return 'agent-identity-token';
    },

    // Validate channel access
    async (channelTopic: string, identity: string) => {
        console.log(\`Agent joining channel: \${channelTopic}\`);
        return true; // allow all channels
    },
);

console.log('✅ Authority registered');`;

    protected readonly agentSnippet = `import { FluxAgent } from '@persistica/flux-agent';

const NETWORK_ID = 'your-network-id';
const NETWORK_CODE = 'your-network-access-code';

const agent = new FluxAgent(NETWORK_ID);

// Connect to the network
const connection = await agent.connect(NETWORK_CODE);
console.log('✅ Connected to network');

// Join a channel
const channel = await connection.joinChannel('general');

// Subscribe to messages
channel.subscribe((message) => {
    console.log('📨 Received:', message);
});

// Publish a message
channel.publish({ text: 'Hello, Flux!' });`;

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

    ngAfterViewInit(

    ): void {
        if (typeof window !== 'undefined' && (window as any).hljs) {
            (window as any).hljs.highlightAll();
        }
    }

    protected copyToClipboard(
        snippetId: string,
        text: string,
    ): void {
        navigator.clipboard.writeText(text).then(() => {
            this.copiedSnippet.set(snippetId);
            setTimeout(() => this.copiedSnippet.set(null), 2000);
        });
    }
}
