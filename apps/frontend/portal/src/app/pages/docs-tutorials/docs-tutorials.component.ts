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
import { SyntaxHighlightPipe } from '$lib/app/_pipes/syntax-highlight.pipe';

interface UserSession {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
}

@Component({
    selector: 'app-docs-tutorials',
    imports: [
        // * Modules
        CommonModule,
        RouterLink,
        // * Pipes
        SyntaxHighlightPipe,
        // * Components
        DashboardLayoutComponent,
    ],
    templateUrl: './docs-tutorials.component.html',
    styleUrls: ['./docs-tutorials.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsTutorialsPageComponent implements OnInit {
    protected readonly userSession = signal<UserSession | null>(null);
    protected readonly copiedSnippet = signal<string | null>(null);

    protected readonly chatMeshSnippet = `import { FluxMeshServer } from '@persistica/flux-mesh';

const server = new FluxMeshServer();

server.onReady(() => {
    console.log('🚀 Chat mesh server is live');
});`;

    protected readonly chatAuthoritySnippet = `import { FluxAuthority } from '@persistica/flux-authority';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const NETWORK_ID = process.env.NETWORK_ID!;
const AUTHORIZATION_KEY = process.env.AUTHORIZATION_KEY!;

const authority = new FluxAuthority(NETWORK_ID);

await authority.registerAuthority({
    networkAccessToken: AUTHORIZATION_KEY,

    // Step 1: Verify the agent's credentials and return an identity token
    authorizeAgentConnection: async (auth: unknown) => {
        const { username, password } = auth as { username: string; password: string };

        const user = await db.users.findOne({ username });
        if (!user || !verifyPassword(password, user.passwordHash)) {
            throw new Error('Invalid credentials');
        }

        return jwt.sign({ userId: user.id, username }, JWT_SECRET, {
            expiresIn: '1h',
        });
    },

    // Step 2: Decide which channels this agent can join
    authorizeChannelAccess: async (channelTopic: string, identity: string) => {
        const payload = jwt.verify(identity, JWT_SECRET) as { userId: string };

        // Only let users join channels they are members of
        const isMember = await db.channelMembers.exists({
            channelTopic,
            userId: payload.userId,
        });

        return isMember;
    },
});

console.log('✅ Chat authority ready');`;

    protected readonly chatAgentSnippet = `import { FluxAgent } from '@persistica/flux-agent';

const NETWORK_ID = process.env.NETWORK_ID!;
const NETWORK_CODE = process.env.NETWORK_CODE!;

// Connect with credentials (passed to authority for validation)
const agent = new FluxAgent(NETWORK_ID);
const connection = await agent.connect(NETWORK_CODE, {
    username: 'alice',
    password: 'hunter2',
});

console.log('✅ Alice connected to the chat network');

// Join a room
const generalChannel = await connection.joinChannel('general');

// Listen for messages
generalChannel.subscribe((message) => {
    const { from, text, timestamp } = message as ChatMessage;
    console.log(\`[\${timestamp}] \${from}: \${text}\`);
});

// Send a message
generalChannel.publish({
    from: 'alice',
    text: 'Hey everyone! 👋',
    timestamp: new Date().toISOString(),
});`;

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
