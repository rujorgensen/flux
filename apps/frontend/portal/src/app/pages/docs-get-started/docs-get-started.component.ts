import {
    ChangeDetectionStrategy,
    Component,
    Signal,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { SyntaxHighlightPipe } from '$lib/app/_pipes/syntax-highlight.pipe';
import { PackageManagerService, TPackageManager } from '$lib/app/_services/package-manager/package-manager.service';

@Component({
    selector: 'app-docs-get-started',
    imports: [
        // * Modules
        CommonModule,
        RouterLink,
        // * Pipes
        SyntaxHighlightPipe,
    ],
    templateUrl: './docs-get-started.component.html',
    styleUrls: ['./docs-get-started.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsGetStartedPageComponent {
    protected readonly copiedSnippet = signal<string | null>(null);
    protected readonly selectedPm: Signal<TPackageManager>;
    protected readonly packageManagers: TPackageManager[] = ['bun', 'npm', 'pnpm', 'yarn'];

    protected readonly meshSnippet = `import { FluxMeshServer } from '@persistica/flux-mesh';

const server = new FluxMeshServer();

server.onReady(() => {
    console.log('🚀 Mesh server running on port 5100');
});`;


    protected readonly authoritySnippet = `import { FluxAuthority } from '@persistica/flux-authority';

const NETWORK_ID = 'your-network-id';
const NETWORK_ACCESS_TOKEN = 'your-network-access-token';

const authority = new FluxAuthority(NETWORK_ID);

await authority.registerAuthority({
    networkAccessToken: NETWORK_ACCESS_TOKEN,

    // Validate network access
    authorizeAgentConnection: async (auth: unknown) => {
        if (!isValidToken(auth)) {
            throw new Error('Access denied');
        }
        return 'agent-identity-token';
    },

    // Validate channel access
    authorizeChannelAccess: async (channelTopic: string, identity: string) => {
        console.log(\`Agent joining channel: \${channelTopic}\`);
        return true; // allow all channels
    },
});

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
        protected readonly _packageManagerService: PackageManagerService,
    ) {
        this.selectedPm = toSignal(this._packageManagerService.selectedPm$, {
            initialValue: 'bun',
        });
    }

    protected copyToClipboard(
        snippetId: string,
        text: string,
    ): void {
        void navigator
            .clipboard
            .writeText(text)
            .then(() => {
                this.copiedSnippet.set(snippetId);
                setTimeout(() => this.copiedSnippet.set(null), 2000);
            });
    }
}
