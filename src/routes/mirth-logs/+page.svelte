<script lang="ts">
	import { closeLogSocket, initLogSocket } from '$lib/websocketClient';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import MirthActivityTimeline from './MirthActivityTimeline.svelte';
	import LogTable from './LogTable.svelte';
	import LogFilters from './components/LogFilters.svelte';
	import DayButtons from './components/DayButtons.svelte';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
	import { logStore } from '../../stores/logStore.svelte';

	let currentTab: 'logs' | 'channels' = $state('logs');

	// Bootstrap on client: ensure selectedDay, and ensure days lists are loaded
	onMount(() => {
		// Only set selectedDay if not already set (e.g., from landing page)
		if (!logStore.selectedDay) {
			const params = new URLSearchParams(window.location.search);
			const dayParam = params.get('day');
			const today = new Date().toISOString().split('T')[0];
			logStore.setSelectedDay(dayParam || today);
		}

		// Load days if not present (direct navigation support)
		try {
			if (!logStore.devLogDays?.length) {
				fetchDevLogDays();
			}
			if (!logStore.messageDays?.length) {
				fetchMessageDays();
			}

			// Ensure initial data for current tab and selected day
			const day = logStore.selectedDay;
			if (day) {
				if (currentTab === 'logs') {
					fetch(`/mirth-logs/api/devLogs/${day}`)
						.then((r) => r.json())
						.then((d) => {
							if (d.success && Array.isArray(d.logs)) logStore.updateDevLogs(d.logs);
						})
						.catch(() => {});
				} else if (currentTab === 'channels') {
					fetch(`/mirth-logs/api/messages/${day}`)
						.then((r) => r.json())
						.then((d) => {
							if (d.success && Array.isArray(d.messages)) logStore.updateMessages(d.messages);
						})
						.catch(() => {});
				}
			}
		} catch {}
	});

	// Keep store.selectedDay in sync with the URL ?day on browser navigation (back/forward)
	onMount(() => {
		const onPop = () => {
			const params = new URLSearchParams(window.location.search);
			const d = params.get('day');
			if (d && d !== logStore.selectedDay) logStore.setSelectedDay(d);
		};
		window.addEventListener('popstate', onPop);
		return () => window.removeEventListener('popstate', onPop);
	});

	// Keep the URL ?day param in sync with store.selectedDay (store → URL) without navigation
	$effect(() => {
		const storeDay = logStore.selectedDay;
		const dayInUrl = $page.url.searchParams.get('day');
		if (typeof window === 'undefined') return;
		if (storeDay && storeDay !== dayInUrl) {
			const url = new URL(window.location.href);
			url.searchParams.set('day', storeDay);
			history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
		}
	});

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
		const day = logStore.selectedDay;
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
		const day = logStore.selectedDay;
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

	// Removed old per-day fetch helpers that updated now-removed setters

	function handleFilters(level: string | null, channel: string | null) {
		logStore.setSelectedLevel(level as any);
		logStore.setSelectedChannel(channel);
	}
	// Debounced range handler to improve performance
	let rangeTimeout: number;
	function handleRange(range: [Date, Date]) {
		// Clear previous timeout
		if (rangeTimeout) {
			clearTimeout(rangeTimeout);
		}

		// Debounce the range update to avoid excessive re-renders
		rangeTimeout = setTimeout(() => {
			logStore.setSelectedRange(range);
		}, 100); // 100ms debounce
	}
	async function handleSelectDay(date: string) {
		console.log('🔍 handleSelectDay called with date:', date, 'currentTab:', currentTab);
		logStore.setSelectedDay(date);

		// For channels tab, fetch messages for selected day into store (server is cached)
		if (currentTab === 'channels') {
			try {
				const res = await fetch(`/mirth-logs/api/messages/${date}`);
				const data = await res.json();
				if (data.success && Array.isArray(data.messages)) {
					logStore.updateMessages(data.messages);
				}
			} catch (e) {
				console.warn('Failed to fetch messages for selected day', e);
			}
		}

		// For logs tab, fetch dev logs for selected day into store
		if (currentTab === 'logs') {
			try {
				const res = await fetch(`/mirth-logs/api/devLogs/${date}`);
				const data = await res.json();
				if (data.success && Array.isArray(data.logs)) {
					logStore.updateCurrentDevLogs(data.logs);
				}
			} catch (e) {
				console.warn('Failed to fetch dev logs for selected day', e);
			}
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

	<Tabs value={currentTab} class="" on:change={(e) => handleTabChange(e.detail)}>
		<TabsList>
			<TabsTrigger value="logs">Logs</TabsTrigger>
			<TabsTrigger value="channels">Channels</TabsTrigger>
		</TabsList>

		<TabsContent value="logs">
			<!-- Day Selection -->
			<div class="mb-6 rounded bg-white p-4 shadow">
				<DayButtons
					selectedDay={logStore.selectedDay}
					todaysLiveEntries={[]}
					days={logStore.devLogDays}
					loading={logStore.loadingDays}
					error={logStore.errorDays}
					onSelectDay={handleSelectDay}
				/>
			</div>

			<!-- Filters -->
			<LogFilters entries={logStore.allDevLogs} onFiltersChange={handleFilters} />

			<div class="mb-6 rounded bg-white p-4 shadow">
				<MirthActivityTimeline entries={logStore.timelineDevLogs} onRangeChange={handleRange} />
			</div>
			<div class="rounded bg-white p-4 shadow">
				<LogTable entries={logStore.filteredDevLogs} selectedRange={logStore.selectedRange} />
			</div>
		</TabsContent>

		<TabsContent value="channels">
			<!-- Day Selection -->
			<div class="mb-6 rounded bg-white p-4 shadow">
				<DayButtons
					selectedDay={logStore.selectedDay}
					todaysLiveEntries={[]}
					days={logStore.messageDays}
					loading={logStore.loadingDays}
					error={logStore.errorDays}
					onSelectDay={handleSelectDay}
				/>
			</div>

			<!-- Filters -->
			<LogFilters entries={logStore.allMessages} onFiltersChange={handleFilters} />

			<div class="mb-6 rounded bg-white p-4 shadow">
				<MirthActivityTimeline
					entries={logStore.timelineMessageEntries}
					onRangeChange={handleRange}
				/>
			</div>
			<div class="rounded bg-white p-4 shadow">
				<LogTable entries={logStore.messages} selectedRange={logStore.selectedRange} />
			</div>
		</TabsContent>
	</Tabs>
</main>
