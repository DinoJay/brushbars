<script lang="ts">
	import { closeLogSocket, initLogSocket } from '$lib/websocketClient';
	import MirthActivityTimeline from './MirthActivityTimeline.svelte';
	import LogTable from './LogTable.svelte';
	import LogFilters from './components/LogFilters.svelte';
	import DayButtons from './components/DayButtons.svelte';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
	import { logStore } from '../../stores/logStore.svelte';

	let currentTab: 'logs' | 'channels' = $state('logs');

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

		// Initial load: fetch days for DayButtons, then also load today's logs.
		fetchDevLogDays(); // does not read from store; logs data.days only
		fetchMessageDays();
		const today = new Date().toISOString().split('T')[0];
		logStore.setSelectedDay(today); // write-only, safe
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
					logStore.updateCurrentMessageLogs(data.messages);
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
				const res = await fetch(`/mirth-logs/api/logs/${day}`);
				const data = await res.json();
				if (data.success && Array.isArray(data.logs)) {
					logStore.updateCurrentDevLogs(data.logs);
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
			const res = await fetch('/mirth-logs/api/days');
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
					logStore.updateCurrentMessageLogs(data.messages);
				}
			} catch (e) {
				console.warn('Failed to fetch messages for selected day', e);
			}
		}

		// For logs tab, fetch dev logs for selected day into store
		if (currentTab === 'logs') {
			try {
				const res = await fetch(`/mirth-logs/api/logs/${date}`);
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
					todaysLiveEntries={[]}
					days={logStore.devLogDays}
					loading={logStore.loadingDays}
					error={logStore.errorDays}
					selectedDay={logStore.selectedDay}
					onSelectDay={handleSelectDay}
				/>
			</div>

			<!-- Filters -->
			<LogFilters entries={logStore.filteredDevLogs} onFiltersChange={handleFilters} />

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
					todaysLiveEntries={[]}
					days={logStore.messageDays}
					loading={logStore.loadingDays}
					error={logStore.errorDays}
					selectedDay={logStore.selectedDay}
					onSelectDay={handleSelectDay}
				/>
			</div>

			<!-- Filters -->
			<LogFilters entries={logStore.allMessageEntries} onFiltersChange={handleFilters} />

			<div class="mb-6 rounded bg-white p-4 shadow">
				<MirthActivityTimeline
					entries={logStore.timelineMessageEntries}
					onRangeChange={handleRange}
				/>
			</div>
			<div class="rounded bg-white p-4 shadow">
				<LogTable entries={logStore.allMessageEntries} selectedRange={logStore.selectedRange} />
			</div>
		</TabsContent>
	</Tabs>
</main>
