import type { TClientId } from './client-id.type';

export type TProcessId = number & { __brand: 'TProcessAddress'; };
export type TMachineAddress = string & { __brand: 'TMachineAddress'; };

export type TProcessAddress = `${TMachineAddress}/${TProcessId}`;

// The direct, full, address
export type TAddress = `${TProcessAddress}/${TClientId}`;

/**
 * 
 * @param { TAddress } address
 * 
 * @returns { [TMachineAddress, TProcessId, TClientId] }
 */
export const splitAddressOrThrow = (
    address: TAddress,
): [TMachineAddress, TProcessId, TClientId] => {
    if ((address.match(/\//g) || []).length !== 2) {
        throw new Error('Invalid address format');
    }

    const [machine, process, client] = address.split('/');

    if (machine === undefined) {
        throw new Error('Machine address is undefined');
    }

    if (Number.isNaN(Number(process))) {
        throw new Error('Process ID is not a number');
    }

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
 * 
 * @param { TAddress | TAddress } address
 * 
 * @returns { [TMachineAddress, TProcessId] }
 */
export const splitProcessAddress = (
    address: TProcessAddress | TAddress,
): [TMachineAddress, TProcessId] => {
    const [machine, process] = address.split('/');

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