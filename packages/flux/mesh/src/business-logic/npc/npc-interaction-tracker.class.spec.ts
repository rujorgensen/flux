import { describe, expect, it } from 'bun:test';
import { NPCInteractionTracker } from './npc-interaction-tracker.class';

describe('NPCInteractionTracker', () => {
    it('should track interaction counts separately per player and npc', () => {
        const interactionTracker = new NPCInteractionTracker();

        expect(
            interactionTracker.incrementInteractionCount('player-1', 'guard'),
        ).toBe(1);
        expect(
            interactionTracker.incrementInteractionCount('player-2', 'guard'),
        ).toBe(1);
        expect(
            interactionTracker.incrementInteractionCount('player-1', 'vendor'),
        ).toBe(1);
        expect(
            interactionTracker.incrementInteractionCount('player-1', 'guard'),
        ).toBe(2);
    });
});
