<!-- runes -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { logStore } from '../../../stores/logStore.svelte';

	interface DayData {
		date: string;
		formattedDate: string;
		stats: {
			total: number;
			INFO: number;
			ERROR: number;
			WARN: number;
			DEBUG: number;
			WARNING?: number;
			FATAL?: number;
			TRACE?: number;
		};
	}

	interface ApiResponse {
		success: boolean;
		days?: DayData[];
		error?: string;
		totalDays?: number;
		totalLogs?: number;
	}

	let days = $state<DayData[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let selectedDay = $state<string | null>(null);
	let dayLogsLoading = $state(false);
	let apiDayLogs = $state<any[]>([]);

	// Reactive derived value that automatically updates current day stats when WebSocket data changes
	let reactiveDays = $derived.by(() => {
		const currentDate = getCurrentDate();

		return days.map((day) => {
			if (isToday(day.date)) {
				// For current day, calculate real-time stats from WebSocket data
				const currentLogs = logStore.websocketEntries;
				const currentDayLogs = currentLogs.filter((log) => {
					const logDate = new Date(log.timestamp).toISOString().split('T')[0];
					return logDate === day.date;
				});

				// Calculate real-time stats
				const realTimeStats = {
					total: currentDayLogs.length,
					INFO: 0,
					ERROR: 0,
					WARN: 0,
					DEBUG: 0,
					WARNING: 0,
					FATAL: 0,
					TRACE: 0
				};

				currentDayLogs.forEach((log) => {
					const level = log.level.toUpperCase();
					if (level in realTimeStats) {
						(realTimeStats as any)[level]++;
					}
				});

				return {
					...day,
					stats: realTimeStats
				};
			}
			// For historical days, return original stats
			return day;
		});
	});

	// Get current date in YYYY-MM-DD format
	function getCurrentDate(): string {
		return new Date().toISOString().split('T')[0];
	}

	// Check if a date is today
	function isToday(date: string): boolean {
		return date === getCurrentDate();
	}

	// Get the appropriate logs for the selected day
	function getDayLogs() {
		if (selectedDay && isToday(selectedDay)) {
			// For current day, use WebSocket data
			const currentLogs = logStore.websocketEntries;
			return currentLogs.filter((log) => {
				const logDate = new Date(log.timestamp).toISOString().split('T')[0];
				return logDate === selectedDay;
			});
		}
		// For historical days, use API data
		return apiDayLogs;
	}

	// Fetch available days
	async function fetchDays() {
		loading = true;
		error = null;

		try {
			const response = await fetch('/mirth-logs/api/days');
			const data: ApiResponse = await response.json();

			if (data.success && data.days) {
				days = data.days;
			} else {
				error = data.error || 'Failed to fetch days';
			}
		} catch (err) {
			error = 'Network error while fetching days';
			console.error('Error fetching days:', err);
		} finally {
			loading = false;
		}
	}

	// Fetch logs for a specific day
	async function fetchDayLogs(date: string) {
		dayLogsLoading = true;
		selectedDay = date;
		apiDayLogs = []; // Clear API logs when fetching a new day

		try {
			if (isToday(date)) {
				// For today, use WebSocket data (real-time)
				console.log('📡 Using WebSocket data for today');
				// Filter current day logs from WebSocket data
				const currentLogs = logStore.websocketEntries;
				const currentDayLogs = currentLogs.filter((log) => {
					const logDate = new Date(log.timestamp).toISOString().split('T')[0];
					return logDate === date;
				});
				console.log(`📊 Found ${currentDayLogs.length} logs for today from WebSocket`);
				// Update main entries to show current day logs in timeline
				logStore.updateEntries(currentDayLogs);
			} else {
				// For historical days, use API
				console.log(`📡 Using API data for ${date}`);
				const response = await fetch(`/mirth-logs/api/logs/${date}`);
				const data = await response.json();
				logStore.updateEntries(data.logs);

				if (data.success) {
					apiDayLogs = data.logs;
					console.log(`📊 Loaded ${data.count} logs for ${date}:`, data.stats);
				} else {
					error = data.error || 'Failed to fetch logs for this day';
				}
			}
		} catch (err) {
			error = 'Network error while fetching day logs';
			console.error('Error fetching day logs:', err);
		} finally {
			dayLogsLoading = false;
		}
	}

	// Get color for log level
	function getLevelColor(level: string): string {
		const colors = {
			INFO: 'bg-blue-100 text-blue-800',
			ERROR: 'bg-red-100 text-red-800',
			WARN: 'bg-yellow-100 text-yellow-800',
			WARNING: 'bg-yellow-100 text-yellow-800',
			DEBUG: 'bg-green-100 text-green-800',
			FATAL: 'bg-red-100 text-red-800',
			TRACE: 'bg-gray-100 text-gray-800'
		};
		return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
	}

	// Get badge for current day indicator
	function getCurrentDayBadge(date: string): string {
		if (isToday(date)) {
			return 'bg-green-100 text-green-800 border border-green-300';
		}
		return '';
	}

	// Effect to monitor WebSocket entries and update main entries when current day is selected
	$effect(() => {
		console.log('📡 WebSocket entries updated in DayButtons:', logStore.websocketEntries.length);

		// If current day is selected, update main entries with latest WebSocket data
		if (selectedDay && isToday(selectedDay)) {
			const currentDayLogs = logStore.websocketEntries.filter((log) => {
				const logDate = new Date(log.timestamp).toISOString().split('T')[0];
				return logDate === selectedDay;
			});
			// logStore.updateEntries(currentDayLogs);
			console.log(
				'🔄 Updated main entries with current day WebSocket data:',
				currentDayLogs.length
			);
		}
	});

	onMount(() => {
		fetchDays();
	});
</script>

<div class="space-y-6">
	<!-- Error Display -->
	{#if error}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<p class="text-sm text-red-700">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="flex justify-center py-8">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
		</div>
	{:else if days.length > 0}
		<!-- Days Grid -->
		<div class="flex gap-4 overflow-x-auto pb-2">
			{#each reactiveDays.reverse() as day}
				<button
					onclick={() => fetchDayLogs(day.date)}
					disabled={dayLogsLoading && selectedDay === day.date}
					class=" w-64 flex-shrink-0 rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-lg disabled:opacity-50 {selectedDay ===
					day.date
						? 'border-blue-500 bg-blue-50 shadow-md'
						: 'hover:bg-gray-50'}"
				>
					<div class="mb-3 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<h3 class="text-lg font-semibold text-gray-900">{day.formattedDate}</h3>
							{#if isToday(day.date)}
								<span
									class="rounded-full px-3 py-1 text-xs font-medium {getCurrentDayBadge(day.date)}"
								>
									📡 Live
								</span>
							{/if}
						</div>
						{#if dayLogsLoading && selectedDay === day.date}
							<div class="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-500"></div>
						{/if}
					</div>

					<div class="mb-4 text-base font-medium text-gray-700">
						Total: {day.stats.total.toLocaleString()} logs
						{#if isToday(day.date)}
							<span class="ml-2 text-sm font-normal text-green-600">(real-time)</span>
						{/if}
					</div>

					<!-- Log Level Stats -->
					<div class="grid grid-cols-2 gap-2">
						{#each Object.entries(day.stats) as [level, count]}
							{#if level !== 'total' && count > 0}
								<div class="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
									<span class="text-sm font-medium text-gray-700">{level}</span>
									<span
										class="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-sm"
									>
										{count.toLocaleString()}
									</span>
								</div>
							{/if}
						{/each}
					</div>
				</button>
			{/each}
		</div>
	{:else if !loading}
		<div class="py-8 text-center text-gray-500">
			No days found. Make sure the API is working and logs are available.
		</div>
	{/if}
</div>
