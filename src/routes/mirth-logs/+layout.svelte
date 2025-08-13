<!-- runes -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores';
	import { logStore } from '$stores/logStore.svelte';
	import { isDark, themeStore } from '$stores/themeStore.svelte';
	import { closeLogSocket, initLogSocket } from '$lib/websocketClient.js';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import DayButtons from './components/DayButtons.svelte';

	const props = $props<{ children?: any }>();

	// Get current tab and day from URL
	const currentTab = $derived.by(() => {
		const pathname = $page.url.pathname;
		if (pathname.includes('/logs')) return 'logs';
		if (pathname.includes('/channels')) return 'channels';
		return 'logs';
	});
	const selectedDay = $derived.by(() => $page.url.searchParams.get('day'));

	// Initialize WebSocket when component mounts
	onMount(() => {
		initLogSocket(
			// onLogFull callback
			(parsedLogs: any[]) => {
				logStore.updateLiveDevLogEntries(parsedLogs);
			},
			// onLogUpdate callback
			(parsedLogs: any[]) => {
				const current = logStore.liveDevLogEntries;
				logStore.updateLiveDevLogEntries([...current, ...parsedLogs]);
			},
			// onMessageUpdate callback
			(parsedMessages: any[]) => {
				logStore.applyMessagesUpdate({ messages: parsedMessages, source: 'ws' });
			}
		);

		return () => closeLogSocket();
	});

	// Initialize theme store on component mount
	$effect(() => {
		if (browser) {
			console.log('🎨 Layout: Initializing theme store');
			themeStore.init();
		}
	});

	// Handle tab changes
	async function handleTabChange(tab: string) {
		const url = new URL(window.location.href);
		url.pathname = `/mirth-logs/${tab}`;

		// Always set day to today when changing tabs
		const today = new Date().toISOString().split('T')[0];
		url.searchParams.set('day', today);

		await goto(url.toString());
	}
</script>

<div
	class="flex min-h-screen flex-col"
	style="background-color: var(--color-bg-primary); color: var(--color-text-primary);"
>
	<!-- Header -->
	<header class="border-b" style="border-color: var(--color-border);">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
			<div class="flex items-center space-x-3">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full"
					style="background-color: var(--color-accent);"
				>
					<span aria-label="satellite" class="text-[15px] leading-none">🛰️</span>
				</div>
				<h1 class="text-lg font-semibold tracking-tight">Mirth Logs</h1>
			</div>

			<!-- Theme Toggle -->
			<button
				onclick={() => {
					console.log('🎨 Theme toggle clicked!');
					themeStore.toggle();
					console.log('🎨 Current theme value:', $isDark);
				}}
				class="rounded-xl p-2.5 transition-transform duration-200 hover:scale-105"
				style="background-color: var(--color-bg-tertiary); color: var(--color-text-secondary); box-shadow: var(--shadow-sm); border: 1px solid var(--color-border);"
				title={$isDark ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if $isDark}
					<!-- Sun icon for dark mode -->
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
						/>
					</svg>
				{:else}
					<!-- Moon icon for light mode -->
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</header>

	<!-- Tabs -->
	<div class="border-b" style="border-color: var(--color-border);">
		<div class="mx-auto max-w-7xl">
			<nav class="flex gap-6 px-4">
				<button
					onclick={() => handleTabChange('logs')}
					class="border-b-2 px-1 py-2.5 text-sm font-medium transition-colors {currentTab === 'logs'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent hover:border-gray-300'}"
					style="color: var(--color-text-primary);"
				>
					Dev Logs
				</button>
				<button
					onclick={() => handleTabChange('channels')}
					class="border-b-2 px-1 py-2.5 text-sm font-medium transition-colors {currentTab ===
					'channels'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent hover:border-gray-300'}"
					style="color: var(--color-text-primary);"
				>
					Messages
				</button>
			</nav>
		</div>
	</div>

	<!-- Main Content -->
	<main class="mx-auto flex max-w-7xl flex-1 flex-col px-4 py-3">
		{@render props.children?.()}
	</main>
</div>
