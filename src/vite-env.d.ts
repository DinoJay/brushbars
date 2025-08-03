/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module 'svelte' {
	export function $state<T>(initial: T): {
		get(): T;
		set(value: T): void;
	};
	export function $effect(fn: () => void): void;
	export function $derived<T>(fn: () => T): T;
}
