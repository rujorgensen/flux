import { describe, expect, it } from 'bun:test';
import { NPCDialogueManager } from './npc-dialogue-manager.class';

describe('NPCDialogueManager', () => {
    it('should return random dialogue for the first interactions and a final line afterwards', () => {
        const randomValues = [0.0, 0.99, 0.4];
        let randomValueIndex = 0;
        const dialogueManager = new NPCDialogueManager(
            [
                'Strength and honor.',
                'Keep your weapon ready.',
                'The crossroads are never quiet.',
            ],
            'You have heard all I can offer. The road is yours now.',
            3,
            () => randomValues[randomValueIndex++] ?? 0,
        );

        expect(dialogueManager.interact('player-1', 'guard')).toEqual({
            interactionCount: 1,
            isFinalResponse: false,
            message: 'Strength and honor.',
            remainingRandomResponses: 2,
        });

        expect(dialogueManager.interact('player-1', 'guard')).toEqual({
            interactionCount: 2,
            isFinalResponse: false,
            message: 'The crossroads are never quiet.',
            remainingRandomResponses: 1,
        });

        expect(dialogueManager.interact('player-1', 'guard')).toEqual({
            interactionCount: 3,
            isFinalResponse: false,
            message: 'Keep your weapon ready.',
            remainingRandomResponses: 0,
        });

        expect(dialogueManager.interact('player-1', 'guard')).toEqual({
            interactionCount: 4,
            isFinalResponse: true,
            message: 'You have heard all I can offer. The road is yours now.',
            remainingRandomResponses: 0,
        });
    });

    it('should track interactions separately per player and npc', () => {
        const dialogueManager = new NPCDialogueManager(
            ['Lok-tar.'],
            'I have nothing more to say.',
            1,
            () => 0,
        );

        expect(dialogueManager.interact('player-1', 'guard').isFinalResponse).toBe(false);
        expect(dialogueManager.interact('player-2', 'guard').isFinalResponse).toBe(false);
        expect(dialogueManager.interact('player-1', 'vendor').isFinalResponse).toBe(false);

        expect(dialogueManager.interact('player-1', 'guard')).toEqual({
            interactionCount: 2,
            isFinalResponse: true,
            message: 'I have nothing more to say.',
            remainingRandomResponses: 0,
        });
    });
});
