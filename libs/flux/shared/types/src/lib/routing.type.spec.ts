import {
    type TAddress,
    type TProcessAddress,
    splitProcessAddress,
} from './routing.type';

describe('splitProcessAddress', () => {
    it('should split a valid address into machine and process', () => {
        const address = 'machine/123' as TProcessAddress;
        const [machine, process] = splitProcessAddress(address);

        expect(machine).toBe('machine');
        expect(process).toBe(123);
    });

    it('should split a valid full address into machine and process', () => {
        const address = 'machine/123/456' as TAddress;
        const [machine, process] = splitProcessAddress(address);

        expect(machine).toBe('machine');
        expect(process).toBe(123);
    });
});