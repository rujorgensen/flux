export const MAX_CHANNEL_MEMBERS = 1_000_000;

/**
 * Calculates the current channel capacity fill as a percentage.
 * Returns a clamped value between 0 and 100 based on MAX_CHANNEL_MEMBERS.
 */
export const deriveChannelFillPercent = (
    members: number,
): number => {
    if (members <= 0) {
        return 0;
    }

    if (members >= MAX_CHANNEL_MEMBERS) {
        return 100;
    }

    return (members / MAX_CHANNEL_MEMBERS) * 100;
};
