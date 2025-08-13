<script lang="ts">
	import { closeLogSocket, initLogSocket } from '$lib/websocketClient.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import DevLogsWrapper from './DevLogsWrapper.svelte';
	import MessagesWrapper from './MessagesWrapper.svelte';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$components/tabs';
	import LoadingSpinner from '$components/LoadingSpinner.svelte';
	import { logStore } from '$stores/logStore.svelte';
	import { isDark, themeStore } from '$stores/themeStore.svelte';
	import type { PageData } from './$types';

	let statusText = $state('Loading days...');

	// Get data from server load function
	const props = $props<{ data: PageData }>();

	let isLoadingData = $state(false);
	let lastFetchedDay = $state<string | null>(null);
	let lastFetchedTab = $state<'logs' | 'channels' | null>(null);
	let hasLoadedInitialData = $state(false);
	let hasInitializedStore = $state(false);

	// Get currentTab from URL
	const currentTab = $derived.by(() => {
		const tab = $page.url.searchParams.get('tab') || 'logs';
		return tab as 'logs' | 'channels';
	});

	// Get selectedDay from URL - always in sync
	const selectedDay = $derived.by(() => {
		return $page.url.searchParams.get('day');
	});

	// Global spinner condition: show a single centered spinner and hide wrappers
	const showGlobalSpinner = $derived.by(() => {
		const daysLoaded =
			currentTab === 'logs'
				? !!(logStore.devLogDays && logStore.devLogDays.length)
				: !!(logStore.messageDays && logStore.messageDays.length);
		return isLoadingData || logStore.loadingDays || !hasLoadedInitialData || !daysLoaded;
	});

	// (removed page-level tab spinner state)

	// Initialize store with server data only once on component mount
	$effect(() => {
		if (hasInitializedStore) {
			console.log('🔄 Store already initialized, skipping');
			return;
		}

		const { data } = props;
		if (data && data.success) {
			console.log('🔄 Initializing store with server data:', { day: data.day, tab: data.tab });
			hasInitializedStore = true;

			// Initialize theme store
			themeStore.init();

			// Set initial day in URL if not present
			const urlDay = selectedDay;
			if (!urlDay && data.day) {
				const url = new URL(window.location.href);
				url.searchParams.set('day', data.day);
				window.history.replaceState({}, '', url.toString());
				console.log('✅ Set initial day in URL:', data.day);
			}

			// Load initial data into store
			if (data.tab === 'channels' && Array.isArray(data.messages)) {
				logStore.applyMessagesUpdate({ day: data.day, messages: data.messages, source: 'api' });
				console.log('✅ Initial messages loaded from server:', data.messages.length);
			} else if (data.tab === 'logs' && Array.isArray(data.logs)) {
				logStore.updateDevLogs(data.logs);
				console.log('✅ Initial dev logs loaded from server:', data.logs.length);
			}

			// Load initial days data
			loadInitialDaysData();
		}
	});

	// Initialize theme store on component mount
	$effect(() => {
		if (browser) {
			console.log('🎨 Component: Initializing theme store');
			themeStore.init();
		}
	});

	// Debug theme changes
	$effect(() => {
		console.log('🎨 Component: Theme changed to:', $isDark ? 'dark' : 'light');
	});

	// Load initial days data for both tabs
	async function loadInitialDaysData() {
		try {
			console.log('🔄 Loading initial days data...');
			// Mark global days loading so UI shows overall spinner and hides placeholder "today"
			logStore.setLoadingDays(true);

			// Load dev log days
			const devLogsRes = await fetch('/mirth-logs/api/devLogs/days');
			if (devLogsRes.ok) {
				const devLogsData = await devLogsRes.json();
				if (devLogsData.success && Array.isArray(devLogsData.days)) {
					logStore.updateDevLogDays(devLogsData.days);
					console.log('✅ Initial dev log days loaded:', devLogsData.days.length);
				}
			}

			// Load message days
			const messagesRes = await fetch('/mirth-logs/api/messages/days');
			if (messagesRes.ok) {
				const messagesData = await messagesRes.json();
				if (messagesData.success && Array.isArray(messagesData.days)) {
					logStore.updateMessageDays(messagesData.days);
					console.log('✅ Initial message days loaded:', messagesData.days.length);
				}
			}
		} catch (error) {
			console.warn('Failed to load initial days data:', error);
		} finally {
			// Done loading day lists for both tabs
			logStore.setLoadingDays(false);
		}
	}

	// Bootstrap with runes: ensure selectedDay and days lists; then load initial data
	// Load initial data when component mounts and store is ready
	$effect(() => {
		if (hasLoadedInitialData) {
			console.log('🔄 Initial data already loaded, skipping');
			return;
		}

		const day = selectedDay;
		const hasDays =
			currentTab === 'logs'
				? logStore.devLogDays && logStore.devLogDays.length > 0
				: logStore.messageDays && logStore.messageDays.length > 0;

		if (day && currentTab && hasDays) {
			console.log('🔄 Loading initial data for day:', day, 'tab:', currentTab);
			hasLoadedInitialData = true;
			fetchDataForDay(day, currentTab);
		}
	});

	// If no ?day is present, set it to TODAY (always treat today as latest)
	// Only run this effect once when first loaded
	let hasSetInitialDay = $state(false);
	$effect(() => {
		if (typeof window === 'undefined' || hasSetInitialDay) return;
		const hasDayParam = !!$page.url.searchParams.get('day');
		if (hasDayParam) return;

		const today = new Date().toISOString().split('T')[0];
		hasSetInitialDay = true;
		const url = new URL(window.location.href);
		url.searchParams.set('day', today);
		goto(url.pathname + '?' + url.searchParams.toString(), {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	});

	// Remove manual history syncing; URL is the source of truth via $page

	// Initialize websocket and load initial data - only runs once
	$effect(() => {
		// Initialize websocket to keep live entries flowing into the store
		initLogSocket(
			(parsedLogs: any[]) => {
				logStore.updateLiveDevLogEntries(parsedLogs);
			},
			(parsedLogs: any[]) => {
				const current = logStore.liveDevLogEntries;
				logStore.updateLiveDevLogEntries([...current, ...parsedLogs]);
			},
			(parsedMessages: any[]) => {
				logStore.applyMessagesUpdate({ messages: parsedMessages, source: 'ws' });
			}
		);

		// Do not override selected day here; it is controlled externally (landing page / URL)
		// fetchDayLogs(today); // does not read from store

		return () => closeLogSocket();
	});

	// Data fetching is now handled in the handleTabChange function

	// Function to fetch data for a specific day and tab
	async function fetchDataForDay(day: string, tab: 'logs' | 'channels') {
		if (!day) {
			console.warn('⚠️ No day provided to fetchDataForDay');
			return;
		}

		// Prevent duplicate fetches
		if (lastFetchedDay === day && lastFetchedTab === tab && !isLoadingData) {
			console.log('🔄 Skipping duplicate fetch for:', tab, 'day:', day);
			return;
		}

		console.log('🔄 Fetching data for:', tab, 'day:', day);
		isLoadingData = true;

		try {
			// Fast client-side update - fetch data directly without navigation
			if (tab === 'channels') {
				console.log('🔄 Fetching messages for day:', day);
				const res = await fetch(`/mirth-logs/api/messages/${day}`);
				if (res.ok) {
					const data = await res.json();
					console.log('📊 Messages API response:', data);
					if (data.success && Array.isArray(data.messages)) {
						logStore.applyMessagesUpdate({ day, messages: data.messages, source: 'api' });
						// Keep day data in sync for subcomponents
						console.log('✅ Fast update: Loaded messages:', data.messages.length);
					} else {
						console.warn('⚠️ Messages API returned invalid data:', data);
					}
				} else {
					console.error('❌ Messages API error:', res.status, res.statusText);
				}
			} else {
				console.log('🔄 Fetching dev logs for day:', day);
				const res = await fetch(`/mirth-logs/api/devLogs/${day}`);
				if (res.ok) {
					const data = await res.json();
					console.log('📊 Dev logs API response:', data);
					if (data.success && Array.isArray(data.logs)) {
						logStore.updateDevLogs(data.logs);
						console.log('✅ Fast update: Loaded dev logs:', data.logs.length);
					} else {
						console.warn('⚠️ Dev logs API returned invalid data:', data);
					}
				} else {
					console.error('❌ Dev logs API error:', res.status, res.statusText);
				}
			}

			// Update tracking variables
			lastFetchedDay = day;
			lastFetchedTab = tab;

			// URL is already updated by handleDayChange, no need to update here
		} catch (e) {
			console.warn(`Failed to fetch ${tab} data for day ${day}:`, e);
		} finally {
			isLoadingData = false;
		}
	}

	// Handle tab changes
	async function handleTabChange(tab: 'logs' | 'channels') {
		console.log('🔄 Tab changed to:', tab);

		// Always treat today as the latest day
		const today = new Date().toISOString().split('T')[0];

		// Clear any active brush selection when switching tabs
		logStore.setSelectedRange(null);

		// Navigate to keep selectedDay in the URL and trigger reactivity
		const url = new URL(window.location.href);
		url.searchParams.set('tab', tab);
		url.searchParams.set('day', today);
		goto(url.pathname + '?' + url.searchParams.toString(), {
			replaceState: true,
			noScroll: true,
			keepFocus: true,
			invalidateAll: false
		});
		console.log('✅ Navigated with latest day for tab:', tab, 'day:', today);

		// Proactively load data for the selected tab/day so timeline updates immediately
		await fetchDataForDay(today, tab);
	}
</script>

<main
	class="mx-auto flex min-h-screen max-w-screen-2xl flex-col p-8 font-sans"
	style="background-color: var(--color-bg-primary); color: var(--color-text-primary);"
>
	<Tabs
		value={currentTab}
		class="flex flex-1 flex-col"
		onChange={(tab) => handleTabChange(tab as 'logs' | 'channels')}
	>
		<div
			class="mb-6 flex items-center justify-between rounded-2xl p-3"
			style="background-color: var(--color-bg-secondary); box-shadow: var(--shadow-md); border: 1px solid var(--color-border);"
		>
			<TabsList class="p-1.5">
				<TabsTrigger value="logs">Logs</TabsTrigger>
				<TabsTrigger value="channels">Channels</TabsTrigger>
			</TabsList>
			<div class="flex items-center space-x-6">
				<h1
					class="flex items-center gap-3 text-2xl font-bold text-gray-900"
					style="color: var(--color-text-primary);"
				>
					<span class="text-3xl">📡</span>
					Mirth Logs
				</h1>
			</div>

			<!-- Theme Toggle -->
			<button
				onclick={() => {
					console.log('🎨 Theme toggle clicked!');
					themeStore.toggle();
					console.log('🎨 Current theme value:', $isDark);
				}}
				class="rounded-xl p-3 transition-all duration-200 hover:scale-105"
				style="background-color: var(--color-bg-tertiary); color: var(--color-text-secondary); box-shadow: var(--shadow-sm);"
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

		<TabsContent value="logs" class="flex flex-1 flex-col">
			<div class="flex flex-1 flex-col">
				{#if showGlobalSpinner}
					<LoadingSpinner class="m-auto" label="Loading…" size={46} />
				{:else}
					<DevLogsWrapper loading={false} />
				{/if}
			</div>
		</TabsContent>

		<TabsContent value="channels">
			<div class="flex flex-1 flex-col">
				{#if showGlobalSpinner}
					<div class="flex min-h-[60vh] items-center justify-center">
						<LoadingSpinner label="Loading…" size={46} />
					</div>
				{:else}
					<MessagesWrapper loading={false} />
				{/if}
			</div>
		</TabsContent>
	</Tabs>
</main>
