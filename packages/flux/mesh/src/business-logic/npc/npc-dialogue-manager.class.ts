import { NPCDialogueScript } from './npc-dialogue-script.class';
import { NPCInteractionTracker } from './npc-interaction-tracker.class';
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
export class NPCDialogueManager {

    private readonly interactionTracker: NPCInteractionTracker;
    private readonly dialogueScript: NPCDialogueScript;

    constructor(
        randomNumberGenerator: () => number = Math.random,
    ) {
        this.interactionTracker = new NPCInteractionTracker();
        this.dialogueScript = new NPCDialogueScript(
            MESH_NPC_RANDOM_MESSAGES,
            MESH_NPC_FINAL_MESSAGE,
            INTERACTION_LIMIT,
            randomNumberGenerator,
        );
    }

    public interact(
        userId: string,
        npcId: string,
    ): INpcInteractionResult {
        const interactionCount: number =
            this.interactionTracker.incrementInteractionCount(userId, npcId);

        return this.dialogueScript.resolveInteraction(interactionCount);
    }
}
