import type { INpcInteractionResult } from './npc-dialogue.types';

const MESH_NPC_RANDOM_MESSAGES: readonly string[] = [
    'Steel yourself, traveler. Strange currents stir beyond these gates.',
    'Every signal leaves a trail. Mind which ones you choose to follow.',
    'I have watched green recruits chase glory into the dark and never return.',
    'The mesh is restless today. Even the quiet channels feel like a warning.',
    'Keep your wits sharp and your blade sharper. This road favors neither fools nor dreamers.',
];

const MESH_NPC_FINAL_MESSAGE =
    'I have shared all the wisdom I can spare. The next step is yours alone, hero.';


const INTERACTION_LIMIT = 5;

export class NPCDialogueScript {

    constructor(
        private readonly randomNumberGenerator: () => number = Math.random,
    ) {}

    public resolveInteraction(
        interactionCount: number,
    ): INpcInteractionResult {
        const isFinalResponse: boolean = interactionCount > INTERACTION_LIMIT;

        return {
            interactionCount,
            isFinalResponse,
            message: this.resolveMessage(isFinalResponse),
            remainingRandomResponses: Math.max(
                INTERACTION_LIMIT - interactionCount,
                0,
            ),
        };
    }

    private resolveMessage(
        isFinalResponse: boolean,
    ): string {
        if (isFinalResponse) {
            return MESH_NPC_FINAL_MESSAGE;
        }

        return MESH_NPC_RANDOM_MESSAGES[
            Math.floor(
                this.randomNumberGenerator() * MESH_NPC_RANDOM_MESSAGES.length,
            )
        ];
    }
}
