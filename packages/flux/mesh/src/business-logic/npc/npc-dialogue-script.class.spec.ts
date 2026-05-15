import { describe, expect, it } from 'bun:test';
import { NPCDialogueScript } from './npc-dialogue-script.class';

describe('NPCDialogueScript', () => {
    it('should resolve random dialogue until the limit and final dialogue afterwards', () => {
        const randomValues = [0.0, 0.99, 0.4];
        let randomValueIndex = 0;
        const dialogueScript = new NPCDialogueScript(
            [
                'Strength and honor.',
                'Keep your weapon ready.',
                'The crossroads are never quiet.',
            ],
            'You have heard all I can offer. The road is yours now.',
            3,
            () => randomValues[randomValueIndex++] ?? 0,
        );

        expect(dialogueScript.resolveInteraction(1)).toEqual({
            interactionCount: 1,
            isFinalResponse: false,
            message: 'Strength and honor.',
            remainingRandomResponses: 2,
        });

        expect(dialogueScript.resolveInteraction(2)).toEqual({
            interactionCount: 2,
            isFinalResponse: false,
            message: 'The crossroads are never quiet.',
            remainingRandomResponses: 1,
        });

        expect(dialogueScript.resolveInteraction(3)).toEqual({
            interactionCount: 3,
            isFinalResponse: false,
            message: 'Keep your weapon ready.',
            remainingRandomResponses: 0,
        });

        expect(dialogueScript.resolveInteraction(4)).toEqual({
            interactionCount: 4,
            isFinalResponse: true,
            message: 'You have heard all I can offer. The road is yours now.',
            remainingRandomResponses: 0,
        });
    });
});
