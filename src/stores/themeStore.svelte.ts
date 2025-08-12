import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Create a writable store for theme state - default to light mode
export const isDark = writable(false);

// Theme store functions
export const themeStore = {
	// Initialize theme from localStorage or system preference
	init() {
		if (!browser) return;

		// Check localStorage first
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			console.log('🎨 Theme store: Loading saved theme:', savedTheme);
			isDark.set(savedTheme === 'dark');
		} else {
			// Check system preference
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			console.log('🎨 Theme store: Using system preference:', prefersDark ? 'dark' : 'light');
			isDark.set(prefersDark);
		}
	},

	// Toggle theme
	toggle() {
		console.log('🎨 Theme store: Toggling theme');
		isDark.update((current) => !current);
	},

	// Set specific theme
	setTheme(theme: 'light' | 'dark') {
		console.log('🎨 Theme store: Setting theme to:', theme);
		isDark.set(theme === 'dark');
	}
};

// Subscribe to theme changes and apply them
if (browser) {
	// Initialize theme first
	themeStore.init();

	// Then subscribe to changes
	isDark.subscribe((value) => {
		console.log('🎨 Theme store: Theme changed to:', value ? 'dark' : 'light');

		// Apply theme whenever the store value changes
		if (value) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}

		// Update localStorage
		localStorage.setItem('theme', value ? 'dark' : 'light');
	});

	// Listen for system theme changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		if (!localStorage.getItem('theme')) {
			// Only auto-update if user hasn't manually set a theme
			console.log('🎨 Theme store: System theme changed to:', e.matches ? 'dark' : 'light');
			isDark.set(e.matches);
		}
	});
}
