import { describe, expect } from "bun:test";
import { it } from "node:test";
import { parseKeyspaceSection } from "./parsers.fn";

describe('Redis info parsers', () => {
    describe('parseKeyspaceSection', () => {
        it('should parse keyspace info correctly #1', () => {
            const input = `# Keyspace
db0:keys=100,expires=50,avg_ttl=5000
db1:keys=200,expires=100,avg_ttl=10000`;

            expect(parseKeyspaceSection(input)).toEqual({
                db0: { keys: 100, expires: 50, avgTtl: 5000 },
                db1: { keys: 200, expires: 100, avgTtl: 10000 },
            });
        });

        it('should parse keyspace info correctly #2', () => {
            const input = `db0:keys=100,expires=50,avg_ttl=5000
db1:keys=200,expires=100,avg_ttl=10000`;

            expect(parseKeyspaceSection(input)).toEqual({
                keys: undefined, expires: undefined, avgTtl: undefined,
            });
        });

        it('should parse keyspace info correctly #3', () => {
            const input = `# Keyspace
db0:keys=18,expires=3,avg_ttl=-1`;

            expect(parseKeyspaceSection(input)).toEqual({
                db0: { keys: 18, expires: 3, avgTtl: -1 },
            });
        });

        it('should parse keyspace info correctly #4', () => {
            const input = `# Replication
role:master
connected_slaves:0
master_replid:c9be4ed28df695c7edd651463e3f87697dbb0333

# Modules
module:name=ReJSON,ver=20000,api=1,filters=0,usedby=[search],using=[],options=[handle-io-errors]
module:name=search,ver=20000,api=1,filters=0,usedby=[],using=[ReJSON],options=[handle-io-errors]

# Keyspace
db0:keys=18,expires=3,avg_ttl=-1

# Cpu
used_cpu_sys:5512.143279
used_cpu_user:6385.882877
used_cpu_sys_children:0.2771
used_cpu_user_children:0.2119
used_cpu_sys_main_thread:1235.271316
used_cpu_user_main_thread:1649.380304
`;

            expect(parseKeyspaceSection(input)).toEqual({
                db0: { keys: 18, expires: 3, avgTtl: -1 },
            });
        });

        it('should parse keyspace info correctly #2', () => {
            expect(parseKeyspaceSection('')).toEqual({
                keys: undefined, expires: undefined, avgTtl: undefined,
            });
        });

    });
});