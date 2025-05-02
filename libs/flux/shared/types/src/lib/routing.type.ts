export type TProcessId = number & { __brand: 'TProcessAddress'; };
export type TMachineAddress = string & { __brand: 'TMachineAddress'; };
export type TClientId = string & { __brand: 'TClientId'; };

export type TProcessAddress = `${TMachineAddress}/${TProcessId}`;

// TIODO : FULL ADDRESS rename
export type TAddress = `${TProcessAddress}/${TClientId}`;

// The direct address
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

export const splitProcessAddress = (
    address: TProcessAddress,
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