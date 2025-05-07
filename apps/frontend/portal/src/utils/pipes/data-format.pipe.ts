/**
 * Formats a date.
 * 
 * @param { Date } date
 * 
 * @returns { string }
 */
export const formatDate = (
    date: Date,
): string => {
    const formatted = date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return formatted;
};