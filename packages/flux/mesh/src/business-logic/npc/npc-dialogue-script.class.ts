import type { INpcInteractionResult } from './npc-dialogue.types';

export class NPCDialogueScript {

    constructor(
        private readonly randomMessages: readonly string[],
        private readonly finalMessage: string,
        private readonly randomInteractionLimit: number,
        private readonly randomNumberGenerator: () => number = Math.random,
    ) {
        if (this.randomMessages.length === 0) {
            throw new Error('NPCDialogueScript requires at least one random message');
        }

        if (this.randomInteractionLimit < 0) {
            throw new Error('NPCDialogueScript random interaction limit cannot be negative');
        }
    }

    public resolveInteraction(
        interactionCount: number,
    ): INpcInteractionResult {
        const isFinalResponse: boolean = interactionCount > this.randomInteractionLimit;

        return {
            interactionCount,
            isFinalResponse,
            message: this.resolveMessage(isFinalResponse),
            remainingRandomResponses: Math.max(
                this.randomInteractionLimit - interactionCount,
                0,
            ),
        };
    }

    private resolveMessage(
        isFinalResponse: boolean,
    ): string {
        if (isFinalResponse) {
            return this.finalMessage;
        }

        return this.randomMessages[
            Math.floor(
                this.randomNumberGenerator() * this.randomMessages.length,
            )
        ];
    }
}
