/**
 * Generates up to two initials from a user's name.
 * e.g. "John Doe" -> "JD"
 */
export function getInitial(name: string): string {
    if (!name) return '';
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('');
}

function getHue(identifier: string): number {
    if (!identifier) return 0;
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
        hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 360);
}

/**
 * Deterministically generates a vibrant HSL color string based on a user ID or name string.
 * This ensures the same user always gets the same avatar color across the application.
 */
export function getColorForUser(identifier: string): string {
    if (!identifier) return '#9e9e9e'; // Default grey for missing identifiers
    return `hsl(${getHue(identifier)}, 70%, 45%)`;
}

/**
 * Deterministically generates a muted, pastel HSL color string based on a document ID.
 * Useful for large background areas.
 */
export function getColorForId(identifier: string): string {
    if (!identifier) return 'var(--mat-sys-surface-container-highest)';
    return `hsl(${getHue(identifier)}, 40%, 92%)`;
}
