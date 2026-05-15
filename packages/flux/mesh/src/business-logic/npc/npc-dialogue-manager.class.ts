import { NPCDialogueScript } from './npc-dialogue-script.class';
import { NPCInteractionTracker } from './npc-interaction-tracker.class';
import type { INpcInteractionResult } from './npc-dialogue.types';

export class NPCDialogueManager {

    private readonly interactionTracker: NPCInteractionTracker;
    private readonly dialogueScript: NPCDialogueScript;

    constructor(
        randomMessages: readonly string[],
        finalMessage: string,
        randomInteractionLimit: number,
        randomNumberGenerator: () => number = Math.random,
    ) {
        this.interactionTracker = new NPCInteractionTracker();
        this.dialogueScript = new NPCDialogueScript(
            randomMessages,
            finalMessage,
            randomInteractionLimit,
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
