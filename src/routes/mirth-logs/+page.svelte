<script lang="ts">
	import { closeLogSocket, initLogSocket } from '$lib/websocketClient.js';

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import DevLogsWrapper from './DevLogsWrapper.svelte';
	import MessagesWrapper from './MessagesWrapper.svelte';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$components/tabs';
	import { logStore } from '$stores/logStore.svelte';
	import type { PageData } from './$types';

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
				logStore.updateMessages(data.messages);
				console.log('✅ Initial messages loaded from server:', data.messages.length);
			} else if (data.tab === 'logs' && Array.isArray(data.logs)) {
				logStore.updateDevLogs(data.logs);
				console.log('✅ Initial dev logs loaded from server:', data.logs.length);
			}

			// Load initial days data
			loadInitialDaysData();
		}
	});

	// Load initial days data for both tabs
	async function loadInitialDaysData() {
		try {
			console.log('🔄 Loading initial days data...');

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

	// If no ?day is present, jump to the latest available day once days are loaded
	// Only run this effect once when days are first loaded, not on every change
	let hasSetInitialDay = $state(false);
	$effect(() => {
		if (typeof window === 'undefined' || hasSetInitialDay) return;
		const hasDayParam = !!$page.url.searchParams.get('day');
		if (hasDayParam) return;

		const daysList = currentTab === 'logs' ? logStore.devLogDays : logStore.messageDays;
		if (daysList && daysList.length) {
			const latest = daysList.reduce(
				(acc: string, d: { date: string }) => (!acc || d.date > acc ? d.date : acc),
				''
			);
			if (latest) {
				hasSetInitialDay = true;
				const url = new URL(window.location.href);
				url.searchParams.set('day', latest);
				goto(url.pathname + '?' + url.searchParams.toString(), {
					replaceState: true,
					noScroll: true,
					keepFocus: true
				});
			}
		}
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
						logStore.updateMessages(data.messages);
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

		// Update URL - currentTab will automatically update via $derived
		const url = new URL(window.location.href);
		url.searchParams.set('tab', tab);
		window.history.replaceState({}, '', url.toString());

		// Fetch data for current day and new tab immediately
		const currentDay = selectedDay;
		if (currentDay) {
			await fetchDataForDay(currentDay, tab);
		}
	}
</script>

<main class="mx-auto min-h-screen max-w-screen-2xl bg-gray-50 p-6 font-sans">
	<div class="mb-6 rounded bg-white p-4 shadow">
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold text-gray-900">Mirth Logs</h1>
			{#if isLoadingData}
				<div class="flex items-center text-blue-600">
					<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
					<span class="text-sm">Loading...</span>
				</div>
			{/if}
		</div>
	</div>

	<Tabs value={currentTab} on:change={(e) => handleTabChange(e.detail as 'logs' | 'channels')}>
		<TabsList class="mb-6 p-2">
			<TabsTrigger value="logs">Logs</TabsTrigger>
			<TabsTrigger value="channels">Channels</TabsTrigger>
		</TabsList>

		<TabsContent value="logs">
			<DevLogsWrapper />
		</TabsContent>

		<TabsContent value="channels">
			<MessagesWrapper />
		</TabsContent>
	</Tabs>
</main>
