import {
    type TAddress,
    type TMachineAddress,
    type TProcessId,
    splitProcessAddress,
} from "@flux/shared/types";

export type TMemberDistribution = 'same-process' | 'same-machine' | 'distributed';

/**
 * Checks the distribution of members in a channel.
 */
export const checkMemberDistribution = (
    memberAddresses: TAddress[],
): TMemberDistribution => {

    if (memberAddresses.length < 2) {
        // Meh, there are one or no members anyway
        return 'same-process';
    }

    const processes: Set<[TMachineAddress, TProcessId]> = new Set(memberAddresses.map(splitProcessAddress));

    // All the addresses are the same, they must be on the same process
    if (processes.size === 1) {
        return 'same-process';
    }

    const machines: Set<TMachineAddress> = new Set([...processes].map(([machine]) => machine));

    // All the machines are the same, they must be on the same machine
    if (machines.size === 1) {
        return 'same-machine';
    }

    return 'distributed';
};
