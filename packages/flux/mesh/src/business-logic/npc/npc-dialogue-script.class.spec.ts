import { describe, expect, it } from 'bun:test';
import { NPCDialogueScript } from './npc-dialogue-script.class';

describe('NPCDialogueScript', () => {
    it('should resolve random dialogue until the limit and final dialogue afterwards', () => {
        const randomValues = [0.0, 0.99, 0.4];
        let randomValueIndex = 0;
        const dialogueScript = new NPCDialogueScript(
            () => randomValues[randomValueIndex++] ?? 0,
        );

        expect(dialogueScript.resolveInteraction(1)).toEqual({
            interactionCount: 1,
            isFinalResponse: false,
            message: 'Steel yourself, traveler. Strange currents stir beyond these gates.',
            remainingRandomResponses: 4,
        });

        expect(dialogueScript.resolveInteraction(2)).toEqual({
            interactionCount: 2,
            isFinalResponse: false,
            message: 'Keep your wits sharp and your blade sharper. This road favors neither fools nor dreamers.',
            remainingRandomResponses: 3,
        });

        expect(dialogueScript.resolveInteraction(3)).toEqual({
            interactionCount: 3,
            isFinalResponse: false,
            message: 'I have watched green recruits chase glory into the dark and never return.',
            remainingRandomResponses: 2,
        });

        expect(dialogueScript.resolveInteraction(4)).toEqual({
            interactionCount: 4,
            isFinalResponse: false,
            message: 'Steel yourself, traveler. Strange currents stir beyond these gates.',
            remainingRandomResponses: 1,
        });
    });
});
