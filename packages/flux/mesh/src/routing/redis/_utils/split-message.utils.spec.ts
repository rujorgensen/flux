import { expect, describe, it } from "bun:test";
import { splitOrThrowMessage } from "./split-message.utils";

describe('splitMessage', () => {
    it('should split message correctly', () => {
        const rawMessage = 'process123:nc-on-pub:agent456:channel789:Hello, World!';
        const result = splitOrThrowMessage(rawMessage as any);
        expect(result).toEqual({
            agentId: 'agent456' as any,
            channelName: 'channel789' as any,
            data: 'Hello, World!',
        });
    });

    it('should handle messages with colons in data', () => {
        const rawMessage = 'process123:nc-on-pub:agent456:channel789:Hello: World: with: colons';
        const result = splitOrThrowMessage(rawMessage as any);
        expect(result).toEqual({
            agentId: 'agent456' as any,
            channelName: 'channel789' as any,
            data: 'Hello: World: with: colons',
        });
    });

    it('should throw error for invalid format', () => {
        const rawMessage = 'invalid:message:format';
        expect(() => splitOrThrowMessage(rawMessage as any)).toThrowError('Invalid message format. Expected at least 4 colons, got 2.');
    });
});