import * as os from 'node:os';
import type {
    TMachineAddress,
    TProcessId,
    TProcessAddress,
} from '@flux/shared/types';

/**
 * Returns the current process ID.
 * 
 * @returns { TProcessId } The current process ID
 */
export const readProcessId = (): TProcessId => {
    return process.pid as TProcessId;
};

let machineAddress: TMachineAddress | undefined;

/**
 * Returns the current machine's network address.
 * 
 * @returns { TMachineAddress } The current machine's network address
 */
export const readMachineAddress = (

): TMachineAddress => {
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
 * @returns { TProcessAddress } The current process address
 */
export const readProcessAddress = (

): TProcessAddress => {
    return `${readMachineAddress()}/${readProcessId()}`;
};
