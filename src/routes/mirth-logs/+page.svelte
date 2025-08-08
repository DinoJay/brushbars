<script lang="ts">
	import { closeLogSocket, initLogSocket } from '$lib/websocketClient';
	import MirthActivityTimeline from './MirthActivityTimeline.svelte';
	import LogTable from './LogTable.svelte';
	import LogFilters from './components/LogFilters.svelte';
	import DayButtons from './components/DayButtons.svelte';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
	import { logStore } from '../../stores/logStore.svelte';

	let currentTab: 'logs' | 'channels' = $state('logs');

	// Initialize websocket to keep live entries flowing into the store
	$effect(() => {
		initLogSocket(
			(parsedLogs: any[]) => {
				logStore.updateLiveDevLogEntries(parsedLogs);
			},
			(parsedLogs: any[]) => {
				const current = logStore.liveDevLogEntries;
				logStore.updateLiveDevLogEntries([...current, ...parsedLogs]);
			}
		);
		return () => closeLogSocket();
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

			let daysList = [];
			if (Array.isArray(data.days)) {
				// single-channel response shape
				daysList = data.days;
			} else if (Array.isArray(data.channels)) {
				// all-channels: aggregate per day
				const sum = (a: number, b: number) => a + b;
				const zero = { total: 0, INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0 };
				const map = new Map();
				for (const ch of data.channels) {
					for (const d of ch.days || []) {
						const key = d.date;
						if (!map.has(key)) {
							map.set(key, { date: key, formattedDate: d.formattedDate, stats: { ...zero } });
						}
						const target = map.get(key);
						target.stats.total = sum(target.stats.total, d.stats?.total || 0);
						target.stats.INFO = sum(target.stats.INFO, d.stats?.INFO || 0);
						target.stats.ERROR = sum(target.stats.ERROR, d.stats?.ERROR || 0);
						target.stats.WARN = sum(target.stats.WARN, d.stats?.WARN || 0);
						target.stats.DEBUG = sum(target.stats.DEBUG, d.stats?.DEBUG || 0);
					}
				}
				daysList = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
				console.log('🔍 fetchMessageDays daysList', daysList);
			}
			logStore.updateMessageDays(daysList);
		} catch (err) {
			logStore.setErrorDays('Network error while loading message days');
		} finally {
			logStore.setLoadingDays(false);
		}
	}

	// API: fetch list of log days (dev logs)
	async function fetchLogDays() {
		logStore.setLoadingDays(true);
		logStore.setErrorDays(null);
		try {
			const res = await fetch('/mirth-logs/api/days');
			const data = await res.json();
			if (data.success && Array.isArray(data.days)) {
				logStore.updateLogDays(data.days);
			} else {
				logStore.setErrorDays(data.error || 'Failed to load log days');
			}
			console.log('🔍 fetchLogDays days', logStore.logDays);
		} catch (err) {
			logStore.setErrorDays('Network error while loading log days');
		} finally {
			logStore.setLoadingDays(false);
		}
	}

	// API: fetch logs for a day and update store entries
	async function fetchDayLogs(date: string) {
		try {
			const res = await fetch(`/mirth-logs/api/logs/${date}`);
			const data = await res.json();
			if (data.success && Array.isArray(data.logs)) {
				logStore.updateLogsFromDays(data.logs);
			}
		} catch (err) {
			console.warn('Failed to fetch day logs:', err);
		}
	}

	// API: fetch messages for a day and update store entries
	async function fetchDayMessages(date: string) {
		try {
			const res = await fetch(`/mirth-logs/api/messages/${date}`);
			const data = await res.json();
			if (data.success && Array.isArray(data.messages)) {
				logStore.updateMessageLogEntries(data.messages);
			}
		} catch (err) {
			console.warn('Failed to fetch day messages:', err);
		}
	}

	function handleFilters(level: string | null, channel: string | null) {
		logStore.setSelectedLevel(level as any);
		logStore.setSelectedChannel(channel);
	}
	function handleRange(range: [Date, Date]) {
		logStore.setSelectedRange(range);
	}
	async function handleSelectDay(date: string) {
		console.log('🔍 handleSelectDay called with date:', date, 'currentTab:', currentTab);
		logStore.setSelectedDay(date);

		// Fetch individual day data based on current tab
		if (currentTab === 'logs') {
			await fetchDayLogs(date);
		} else {
			await fetchDayMessages(date);
		}
	}

	function handleTabChange(next: string) {
		console.log('🔍 handleTabChange called with next:', next, 'currentTab before:', currentTab);
		currentTab = next === 'channels' ? 'channels' : 'logs';
		console.log('🔍 currentTab after:', currentTab);

		if (currentTab === 'logs') {
			console.log('🔍 Switching to logs tab');
			fetchLogDays();
			// Also fetch current day's logs if a day is selected
			if (logStore.selectedDay) {
				console.log('🔍 Fetching current day logs:', logStore.selectedDay);
			}
		} else {
			console.log('🔍 Switching to channels tab');
			fetchMessageDays();
			// No need to fetch individual messages - we have aggregated stats
		}
	}

	// initial load - load dev logs since that's the default tab
	$effect(() => {
		fetchLogDays();
	});
</script>

<main class="mx-auto min-h-screen max-w-screen-2xl bg-gray-50 p-6 font-sans">
	<h1 class="mb-4 text-2xl font-bold">📋 📡 Mirth Log Dashboard</h1>

	<Tabs defaultValue="logs" class="" on:change={(e) => handleTabChange(e.detail)}>
		<TabsList>
			<TabsTrigger value="logs">Logs</TabsTrigger>
			<TabsTrigger value="channels">Channels</TabsTrigger>
		</TabsList>

		<TabsContent value="logs">
			<!-- Day Selection -->
			<div class="mb-6 rounded bg-white p-4 shadow">
				<DayButtons
					todaysLiveEntries={logStore.allDevLogEntries}
					days={logStore.logDays}
					loading={logStore.loadingDays}
					error={logStore.errorDays}
					selectedDay={logStore.selectedDay}
					onSelectDay={handleSelectDay}
				/>
			</div>

			<!-- Filters -->
			<LogFilters entries={logStore.allDevLogEntries} onFiltersChange={handleFilters} />

			<div class="mb-6 rounded bg-white p-4 shadow">
				<MirthActivityTimeline entries={logStore.allDevLogEntries} onRangeChange={handleRange} />
			</div>
			<div class="rounded bg-white p-4 shadow">
				<LogTable entries={logStore.allDevLogEntries} selectedRange={logStore.selectedRange} />
			</div>
		</TabsContent>

		<TabsContent value="channels">
			<!-- Day Selection -->
			<div class="mb-6 rounded bg-white p-4 shadow">
				<DayButtons
					todaysLiveEntries={logStore.allMessageEntries}
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
				<MirthActivityTimeline entries={logStore.allMessageEntries} onRangeChange={handleRange} />
			</div>
			<div class="rounded bg-white p-4 shadow">
				<LogTable entries={logStore.allMessageEntries} selectedRange={logStore.selectedRange} />
			</div>
		</TabsContent>
	</Tabs>
</main>
