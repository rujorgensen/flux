import type { TClientId } from './client-id.type';

export type TProcessId = number & { __brand: 'TProcessAddress'; };
export type TMachineAddress = string & { __brand: 'TMachineAddress'; };

export type TProcessAddress = `${TMachineAddress}/${TProcessId}`;

// The direct, full, address
export type TAddress = `${TProcessAddress}/${TClientId}`;

/**
 * Splits a full address into its machine, process, and client ID components.
 */
export const splitAddressOrThrow = (
    address: TAddress,
): [TMachineAddress, TProcessId, TClientId] => {
    if ((address.match(/\//g) || []).length !== 2) {
        throw new Error('Invalid address format');
    }

    const [machine, process, client] = address.split('/');

    // oxlint-disable-next-line typescript/no-unnecessary-condition
    if (machine === undefined) {
        throw new Error('Machine address is undefined');
    }

    if (Number.isNaN(Number(process))) {
        throw new Error('Process ID is not a number');
    }

    // oxlint-disable-next-line typescript/no-unnecessary-condition
    if (client === undefined) {
        throw new Error('Client ID is undefined');
    }

    return [
        machine as TMachineAddress,
        Number.parseInt(process, 10) as TProcessId,
        client as TClientId,
    ];
};

/**
 * Splits a process address into its machine and process ID components.
 */
export const splitProcessAddress = (
    address: TProcessAddress | TAddress,
): [TMachineAddress, TProcessId] => {
    const [machine, process] = address.split('/');

    // oxlint-disable-next-line typescript/no-unnecessary-condition
    if (machine === undefined) {
        throw new Error('Machine address is undefined');
    }

    if (Number.isNaN(Number(process))) {
        throw new Error('Process ID is not a number');
    }

    return [
        machine as TMachineAddress,
        Number.parseInt(process, 10) as TProcessId,
    ];
};