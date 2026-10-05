import { Injectable, signal, effect } from '@angular/core';

export type ThemeType = 'light' | 'dark' | 'system';
const THEME_STORAGE_KEY = 'collab_docs_theme';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    readonly themeSig = signal<ThemeType>('system');
    private isInitialized = false;

    constructor() {
        this.loadTheme();
        effect(() => {
            const theme = this.themeSig();
            if (!this.isInitialized) {
                this.isInitialized = true;
                this.applyTheme(theme, true);
            } else {
                this.applyTheme(theme, false);
            }
        });
    }

    private loadTheme(): void {
        try {
            const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeType | null;
            if (stored && ['light', 'dark', 'system'].includes(stored)) {
                this.themeSig.set(stored);
            }
        } catch (e) {
            console.warn('Failed to load theme from localStorage', e);
        }
    }

    setTheme(theme: ThemeType): void {
        this.themeSig.set(theme);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (e) {
            console.warn('Failed to save theme to localStorage', e);
        }
    }

    applyTheme(theme: ThemeType, isInitialization = false): void {
        const updateDOM = () => {
            const root = document.documentElement;
            if (theme === 'system') {
                root.removeAttribute('data-theme');
            } else {
                root.setAttribute('data-theme', theme);
            }
        };

        if (
            !isInitialization &&
            typeof document !== 'undefined' &&
            'startViewTransition' in document
        ) {
            document.startViewTransition(() => {
                updateDOM();
            });
        } else {
            updateDOM();
        }
    }

    initializeTheme(): void {
        this.applyTheme(this.themeSig(), true);
    }
}
