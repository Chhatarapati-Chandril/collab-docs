export type CoverCategory =
    | 'All'
    | 'Minimal & Elegant'
    | 'Professional & Business'
    | 'Creative & Artistic'
    | 'Nature & Travel'
    | 'Technology & Abstract'
    | 'Dark & Premium';

export interface CoverTemplate {
    id: string;
    name: string;
    category: Exclude<CoverCategory, 'All'>;
    description: string;
    url: string;
    aspectRatio: string;
}

export const COVER_CATEGORIES: CoverCategory[] = [
    'All',
    'Minimal & Elegant',
    'Professional & Business',
    'Creative & Artistic',
    'Nature & Travel',
    'Technology & Abstract',
    'Dark & Premium',
];

export const COVER_TEMPLATES: CoverTemplate[] = [
    // 1. Minimal & Elegant
    {
        id: 'minimal-zenith',
        name: 'Zenith Travertine',
        category: 'Minimal & Elegant',
        description: 'Warm sandstone arch with delicate serif typography & balanced negative space.',
        url: '/covers/templates/minimal-zenith.svg',
        aspectRatio: '16:9',
    },
    {
        id: 'minimal-monochrome',
        name: 'Swiss Monochrome',
        category: 'Minimal & Elegant',
        description: 'Clean typographic grid system with editorial precision and crosshair framing.',
        url: '/covers/templates/minimal-monochrome.svg',
        aspectRatio: '16:9',
    },

    // 2. Professional & Business
    {
        id: 'business-azure',
        name: 'Executive Azure',
        category: 'Professional & Business',
        description: 'Deep sapphire corporate gradient with flowing isometric lines & precision grid.',
        url: '/covers/templates/business-azure.svg',
        aspectRatio: '16:9',
    },
    {
        id: 'business-slate',
        name: 'Slate & Graphite',
        category: 'Professional & Business',
        description: 'Polished executive slate with brushed steel accents and growth trajectories.',
        url: '/covers/templates/business-slate.svg',
        aspectRatio: '16:9',
    },

    // 3. Creative & Artistic
    {
        id: 'creative-prism',
        name: 'Prism Spectrum',
        category: 'Creative & Artistic',
        description: 'Iridescent gradient mesh with fluid contours and frosted glass morphology.',
        url: '/covers/templates/creative-prism.svg',
        aspectRatio: '16:9',
    },
    {
        id: 'creative-bauhaus',
        name: 'Modernist Bauhaus',
        category: 'Creative & Artistic',
        description: 'Constructivist color-block poster geometry in terracotta, mustard, and navy.',
        url: '/covers/templates/creative-bauhaus.svg',
        aspectRatio: '16:9',
    },

    // 4. Nature & Travel
    {
        id: 'nature-aurora',
        name: 'Nordic Aurora',
        category: 'Nature & Travel',
        description: 'Ethereal emerald and cyan boreal light over dark mountain topographic contours.',
        url: '/covers/templates/nature-aurora.svg',
        aspectRatio: '16:9',
    },
    {
        id: 'nature-sahara',
        name: 'Sahara Horizon',
        category: 'Nature & Travel',
        description: 'Golden hour desert sand dunes with warm amber lighting and organic ridge lines.',
        url: '/covers/templates/nature-sahara.svg',
        aspectRatio: '16:9',
    },

    // 5. Technology & Abstract
    {
        id: 'tech-quantum',
        name: 'Quantum Matrix',
        category: 'Technology & Abstract',
        description: 'Obsidian cyan isometric circuitry with cybernetic nodes and system telemetry.',
        url: '/covers/templates/tech-quantum.svg',
        aspectRatio: '16:9',
    },
    {
        id: 'tech-hologram',
        name: 'Neural Hologram',
        category: 'Technology & Abstract',
        description: 'Fluid wavelength interference ribbons in ultraviolet and electric teal.',
        url: '/covers/templates/tech-hologram.svg',
        aspectRatio: '16:9',
    },

    // 6. Dark & Premium
    {
        id: 'dark-obsidian-gold',
        name: 'Obsidian & Gold',
        category: 'Dark & Premium',
        description: 'Luxury midnight velvet with metallic gold geometric hairlines and atelier typography.',
        url: '/covers/templates/dark-obsidian-gold.svg',
        aspectRatio: '16:9',
    },
    {
        id: 'dark-carbon-noir',
        name: 'Carbon Noir',
        category: 'Dark & Premium',
        description: 'Aerospace composite weave with crimson edge lighting and stealth technical accents.',
        url: '/covers/templates/dark-carbon-noir.svg',
        aspectRatio: '16:9',
    },
];
