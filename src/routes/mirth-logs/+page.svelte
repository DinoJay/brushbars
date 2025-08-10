<script lang="ts">
	import { closeLogSocket, initLogSocket } from '$lib/websocketClient.js';

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import DevLogsWrapper from './DevLogsWrapper.svelte';
	import MessagesWrapper from './MessagesWrapper.svelte';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$components/ui/tabs';
	import { logStore } from '$stores/logStore.svelte';

	let currentTab: 'logs' | 'channels' = $state('logs');
	// Show a global spinner until the relevant days are loaded
	let showSpinner = $derived.by(() => {
		const isLoading = logStore.loadingDays;
		const missingDays =
			currentTab === 'logs'
				? !(logStore.devLogDays && logStore.devLogDays.length)
				: !(logStore.messageDays && logStore.messageDays.length);
		return isLoading || missingDays;
	});

	// Single source of truth for the selected day: always read from URL (no fallback here)
	const selectedDayFromUrl = $derived(() => $page.url.searchParams.get('day'));

	// Mirror URL -> store (one-way) so the rest of the app can consume the store
	$effect(() => {
		const day = selectedDayFromUrl();
		if (day && logStore.selectedDay !== day) {
			logStore.setSelectedDay(day);
		}
	});

	// Bootstrap with runes: ensure selectedDay and days lists; then load initial data
	let didInit = $state(false);
	$effect(() => {
		if (didInit) return;
		didInit = true;

		// Load days if not present (direct navigation support)
		try {
			if (!logStore.devLogDays?.length) {
				fetchDevLogDays();
			}
			if (!logStore.messageDays?.length) {
				fetchMessageDays();
			}
		} catch {}
	});

	// If no ?day is present, jump to the latest available day once days are loaded
	$effect(() => {
		if (typeof window === 'undefined') return;
		const hasDayParam = !!$page.url.searchParams.get('day');
		if (hasDayParam) return;
		const daysList = currentTab === 'logs' ? logStore.devLogDays : logStore.messageDays;
		if (daysList && daysList.length) {
			const latest = daysList.reduce(
				(acc: string, d: { date: string }) => (!acc || d.date > acc ? d.date : acc),
				''
			);
			if (latest) {
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

	// Auto-fetch messages for selected day when in channels tab (uses server cache)
	$effect(() => {
		if (currentTab !== 'channels') return;
		const day = selectedDayFromUrl();
		if (!day) return;
		const controller = new AbortController();
		(async () => {
			try {
				const res = await fetch(`/mirth-logs/api/messages/${day}`);
				const data = await res.json();
				if (data.success && Array.isArray(data.messages)) {
					logStore.updateMessages(data.messages);
				}
			} catch (e) {
				console.warn('Failed to auto-fetch messages for selected day', e);
			}
		})();
		return () => controller.abort();
	});

	// Auto-fetch dev logs for selected day when in logs tab
	$effect(() => {
		if (currentTab !== 'logs') return;
		const day = selectedDayFromUrl();
		if (!day) return;
		const controller = new AbortController();
		(async () => {
			try {
				const res = await fetch(`/mirth-logs/api/devLogs/${day}`);
				const data = await res.json();
				if (data.success && Array.isArray(data.logs)) {
					logStore.updateDevLogs(data.logs);
				}
			} catch (e) {
				console.warn('Failed to auto-fetch dev logs for selected day', e);
			}
		})();
		return () => controller.abort();
	});

	// API: fetch list of message days (aggregated across channels)
	async function fetchMessageDays() {
		logStore.setLoadingDays(true);
		logStore.setErrorDays(null);
		try {
			const res = await fetch('/mirth-logs/api/messages/days?days=30');
			const data = await res.json();
			if (!data.success) {
				logStore.setErrorDays(data.error || 'Failed to load message days');
				return;
			}
			console.log('🔍 fetchMessageDays data', data);

			logStore.updateMessageDays(data.days);
		} catch (err) {
			logStore.setErrorDays('Network error while loading message days');
		} finally {
			logStore.setLoadingDays(false);
		}
	}

	// API: fetch list of log days (dev logs)
	async function fetchDevLogDays() {
		logStore.setLoadingDays(true);
		logStore.setErrorDays(null);
		try {
			const res = await fetch('/mirth-logs/api/devLogs/days');
			const data = await res.json();
			if (data.success && Array.isArray(data.days)) {
				console.log('🔍 fetchDevLogDays days', data.days);
				logStore.updateDevLogDays(data.days);
			} else {
				logStore.setErrorDays(data.error || 'Failed to load log days');
			}
			console.log('🔍 fetchLogDays days', data.days);
		} catch (err) {
			logStore.setErrorDays('Network error while loading log days');
		} finally {
			logStore.setLoadingDays(false);
		}
	}

	async function handleSelectDay(date: string) {
		// Optimistically update store for immediate UI feedback; URL remains source of truth
		if (logStore.selectedDay !== date) {
			logStore.setSelectedDay(date);
		}
		// Update the URL so $page changes and effects refetch
		const url = new URL(window.location.href);
		url.searchParams.set('day', date);
		await goto(url.pathname + '?' + url.searchParams.toString(), {
			replaceState: false,
			noScroll: true,
			keepFocus: true
		});

		// Also fetch immediately so UI updates without waiting for effects
		try {
			if (currentTab === 'logs') {
				const res = await fetch(`/mirth-logs/api/devLogs/${date}`);
				const data = await res.json();
				if (data.success && Array.isArray(data.logs)) {
					logStore.updateDevLogs(data.logs);
				}
			} else {
				const res = await fetch(`/mirth-logs/api/messages/${date}`);
				const data = await res.json();
				if (data.success && Array.isArray(data.messages)) {
					logStore.updateMessages(data.messages);
				}
			}
		} catch (e) {
			console.warn('Failed to fetch data for selected day', e);
		}
	}

	function handleTabChange(next: string) {
		const newTab = next === 'channels' ? 'channels' : 'logs';
		if (newTab === currentTab) return; // avoid duplicate change loops
		currentTab = newTab;
	}
</script>

<main class="mx-auto min-h-screen max-w-screen-2xl bg-gray-50 p-6 font-sans">
	<h1 class="mb-4 text-2xl font-bold">📋 📡 Mirth Log Dashboard</h1>

	{#if showSpinner}
		<div class="flex min-h-[60vh] items-center justify-center">
			<div class="text-center">
				<div
					class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"
				></div>
				<p class="text-gray-600">Loading days…</p>
			</div>
		</div>
	{:else}
		<Tabs value={currentTab} class="" on:change={(e) => handleTabChange(e.detail)}>
			<TabsList>
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
	{/if}
</main>
