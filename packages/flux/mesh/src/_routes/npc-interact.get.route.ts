import type * as Bun from 'bun';
import * as nodeURL from 'node:url';
import { NPCDialogueManager } from '../business-logic/npc/npc-dialogue-manager.class';

const DEFAULT_NPC_ID = 'mesh-guide';

const readFirstHeaderValue = (
    value: string | null,
): string | undefined => {
    const trimmedValue: string | undefined = value
        ?.split(',')[0]
        ?.trim();

    return trimmedValue && trimmedValue.length > 0
        ? trimmedValue
        : undefined;
};

const readQueryValue = (
    value: string | string[] | undefined,
): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue: string = value.trim();

    return trimmedValue.length > 0
        ? trimmedValue
        : undefined;
};


const npcDialogueManager: NPCDialogueManager = new NPCDialogueManager(
    Math.random,
);

const resolvePlayerId = (
    request: Bun.BunRequest,
    parsedUrl: nodeURL.UrlWithParsedQuery,
): string =>
    readQueryValue(parsedUrl.query['playerId'])
    ?? readFirstHeaderValue(request.headers.get('x-forwarded-for'))
    ?? readFirstHeaderValue(request.headers.get('x-real-ip'))
    ?? 'anonymous';

/**
 * Returns mesh NPC dialogue with random flavor text for the first few
 * interactions from the same player, then a fixed final line afterwards.
 */
export const interactWithNpc = (
    request: Bun.BunRequest,
): Response => {
    const parsedUrl: nodeURL.UrlWithParsedQuery = nodeURL.parse(request.url, true);
    const npcId: string = readQueryValue(parsedUrl.query['npcId']) ?? DEFAULT_NPC_ID;
    const playerId: string = resolvePlayerId(request, parsedUrl);
    const interaction = npcDialogueManager.interact(playerId, npcId);

    return new Response(
        interaction.message,
        {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        },
    );
};
