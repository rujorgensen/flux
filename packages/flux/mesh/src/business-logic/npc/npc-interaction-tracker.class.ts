export class NPCInteractionTracker {

    private readonly interactionCountByUserAndNpc: Map<string, number> = new Map();

    public incrementInteractionCount(
        userId: string,
        npcId: string,
    ): number {
        const interactionKey: string = this.buildInteractionKey(userId, npcId);
        const interactionCount: number =
            (this.interactionCountByUserAndNpc.get(interactionKey) ?? 0) + 1;

        this.interactionCountByUserAndNpc.set(interactionKey, interactionCount);

        return interactionCount;
    }

    private buildInteractionKey(
        userId: string,
        npcId: string,
    ): string {
        return `${userId}:${npcId}`;
    }
}
