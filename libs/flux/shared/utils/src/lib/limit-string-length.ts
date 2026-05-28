/**
 * Truncates a string to a specified maximum length and appends ".." if it exceeds the limit.
 */
export const truncateString = (
    string: string,
    maxLength: number = 8,
): string => {
    return string.length > maxLength
        ? string.substring(0, maxLength) + '..'
        : string;
};