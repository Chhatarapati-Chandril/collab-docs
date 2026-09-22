export interface AnonymousIdentity {
    name: string;
    emoji: string;
}

export const ANONYMOUS_IDENTITIES: AnonymousIdentity[] = [
    { name: 'Fox', emoji: '🦊' },
    { name: 'Panda', emoji: '🐼' },
    { name: 'Koala', emoji: '🐨' },
    { name: 'Lion', emoji: '🦁' },
    { name: 'Owl', emoji: '🦉' },
    { name: 'Turtle', emoji: '🐢' },
    { name: 'Octopus', emoji: '🐙' },
    { name: 'Butterfly', emoji: '🦋' },
    { name: 'Penguin', emoji: '🐧' },
    { name: 'Frog', emoji: '🐸' },
] as const;
