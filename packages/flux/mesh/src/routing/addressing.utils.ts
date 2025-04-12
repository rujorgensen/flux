import os from 'node:os';
import type {
    TMachineAddress,
    TProcessId,
    TProcessAddress,
} from '@flux/shared';

export const readProcessId = (): TProcessId => {
    return process.pid as TProcessId;
};

let machineAddress: TMachineAddress | undefined;
export const readMachineAddress = (): TMachineAddress => {
    if (machineAddress) {
        return machineAddress;
    }

    machineAddress = Object.values(os.networkInterfaces())
        .flat()
        .find((i) => i && !i.internal && i.mac !== '00:00:00:00:00:00')
        ?.mac.replaceAll(':', '')
        .replace(/^0+/, '') as TMachineAddress;

    return machineAddress;
};

/**
 * Returns the process address.
 *
 * @returns { TProcessAddress }
 */
export const readProcessAddress = (): TProcessAddress => {
    return `${readMachineAddress()}/${readProcessId()}`;
};
