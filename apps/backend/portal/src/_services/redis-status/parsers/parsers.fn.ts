
export const parseInfoSection = (
    info: string,
): Record<string, number | string> => {
    const lines = info.split('\n');
    const result: Record<string, number | string> = {};

    for (const line of lines) {
        if (!line.startsWith('#') && line.includes(':')) {
            const [key, val] = line.split(':');
            const parsed = Number.parseFloat(val);
            result[key] = Number.isNaN(parsed) ? val.trim() : parsed;
        }
    }

    return result;
}

export const parseKeyspaceSection = (
    info: string,
) => {
    const lines = info.split('\n');
    const dbStats: Record<string, { keys: number; expires: number; avgTtl: number }> = {};

    for (const line of lines) {
        if (line.startsWith('db')) {
            const [db, stats] = line.split(':');
            const entries = stats.split(',').reduce((acc, pair) => {
                const [k, v] = pair.split('=');
                acc[k] = Number.parseInt(v);
                return acc;
            }, {} as any);
            dbStats[db] = {
                keys: entries.keys || 0,
                expires: entries.expires || 0,
                avgTtl: entries.avg_ttl || 0,
            };
        }
    }

    return dbStats;
}
