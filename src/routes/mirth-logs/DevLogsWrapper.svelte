<!-- runes -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DayButtons from '$components/DayButtons.svelte';
	import LogFilters from '$components/LogFilters.svelte';
	import MirthActivityTimeline from '$components/timeline/MirthActivityTimeline.svelte';
	import LogTable from '$components/LogTable.svelte';
	import { logStore } from '$stores/logStore.svelte';
	import LoadingSpinner from '$components/LoadingSpinner.svelte';

	// Get selected day directly from URL
	function selectedDayFromUrl() {
		return $page.url.searchParams.get('day');
	}

	async function handleSelectDay(date: string) {
		// Update URL directly - selectedDay will automatically update via $derived
		const url = new URL(window.location.href);
		url.searchParams.set('day', date);
		await goto(url.pathname + '?' + url.searchParams.toString(), {
			replaceState: false,
			noScroll: true,
			keepFocus: true
		});

		// Check if selected date is today
		const today = new Date().toISOString().split('T')[0];
		if (date === today) {
			// If today is selected, the timeline will automatically use live WebSocket data
			console.log('📅 Today selected, timeline will show live WebSocket updates');
		} else {
			// Fetch data for the selected day from API
			await fetchDataForDay(date);
		}
	}

	// Fetch data for a specific day
	async function fetchDataForDay(day: string) {
		if (!day) return;

		try {
			console.log('🔄 Fetching dev logs for day:', day);
			const res = await fetch(`/mirth-logs/api/devLogs/${day}`);
			if (res.ok) {
				const data = await res.json();
				if (data.success && Array.isArray(data.logs)) {
					logStore.updateDevLogs(data.logs);
					console.log('✅ Loaded dev logs:', data.logs.length);
				}
			}
		} catch (error) {
			console.warn('Failed to fetch dev logs for day:', day, error);
		}
	}

	const showSpinner = $derived.by(
		() => logStore.loadingDays || !(logStore.devLogDays && logStore.devLogDays.length)
	);

	// Smart timeline data source that automatically switches between stored and live data
	const timelineDataForSelectedDay = $derived.by(() => {
		const selectedDay = selectedDayFromUrl();

		if (!selectedDay) return logStore.timelineDevLogs;

		const today = new Date().toISOString().split('T')[0];

		if (selectedDay === today) {
			// For today: use live WebSocket data + any stored data for today
			const liveTodayLogs = logStore.liveDevLogEntries.filter((log) => {
				try {
					const logDate = new Date(log.timestamp).toISOString().split('T')[0];
					return logDate === today;
				} catch {
					return false;
				}
			});

			const storedTodayLogs = logStore.timelineDevLogs.filter((log) => {
				try {
					const logDate = new Date(log.timestamp).toISOString().split('T')[0];
					return logDate === today;
				} catch {
					return false;
				}
			});

			// Merge live and stored logs, avoiding duplicates
			const allTodayLogs = [...storedTodayLogs];
			const existingIds = new Set(storedTodayLogs.map((log) => log.id));

			liveTodayLogs.forEach((log) => {
				if (!existingIds.has(log.id)) {
					allTodayLogs.push(log);
				}
			});

			console.log(
				`🔄 Timeline for today: ${liveTodayLogs.length} live + ${storedTodayLogs.length} stored = ${allTodayLogs.length} total`
			);
			return allTodayLogs;
		} else {
			// For other days: use stored data only
			return logStore.timelineDevLogs.filter((log) => {
				try {
					const logDate = new Date(log.timestamp).toISOString().split('T')[0];
					return logDate === selectedDay;
				} catch {
					return false;
				}
			});
		}
	});

	// Filter logs based on selected day and time range
	const filteredLogsForSelectedDay = $derived.by(() => {
		const selectedDay = selectedDayFromUrl();

		if (!selectedDay) return logStore.filteredDevLogs;

		// First filter by selected day
		let filtered = logStore.filteredDevLogs.filter((log) => {
			const logDate = new Date(log.timestamp).toISOString().split('T')[0];
			return logDate === selectedDay;
		});

		// Then apply time range filter if present
		if (logStore.selectedRange && logStore.selectedRange.length === 2) {
			const [start, end] = logStore.selectedRange;
			if (
				start instanceof Date &&
				end instanceof Date &&
				!isNaN(start.getTime()) &&
				!isNaN(end.getTime())
			) {
				const startMs = start.getTime();
				const endMs = end.getTime();

				filtered = filtered.filter((log) => {
					const logMs = new Date(log.timestamp).getTime();
					return logMs >= startMs && logMs <= endMs;
				});
			}
		}

		return filtered;
	});
</script>

{#if showSpinner}
	<div class="flex min-h-[60vh] items-center justify-center">
		<LoadingSpinner label="Loading days…" size={40} />
	</div>
{:else}
	<div
		class="mb-4 rounded p-3 shadow"
		style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
	>
		<DayButtons
			selectedDay={selectedDayFromUrl()}
			todaysLiveEntries={logStore.liveDevLogEntries}
			days={logStore.devLogDays}
			loading={logStore.loadingDays}
			error={logStore.errorDays}
			onSelectDay={handleSelectDay}
		/>
	</div>

	<LogFilters
		entries={logStore.allDevLogs}
		onFiltersChange={(l, c) => {
			logStore.setSelectedLevel(l as any);
			logStore.setSelectedChannel(c);
		}}
	/>

	<div
		class="mb-4 rounded p-3 shadow"
		style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
	>
		<MirthActivityTimeline
			entries={timelineDataForSelectedDay}
			onRangeChange={(r) => logStore.setSelectedRange(r)}
			resetOn={`${selectedDayFromUrl() || ''}|${logStore.selectedChannel || ''}`}
		/>
	</div>
	<div
		class="rounded p-3 shadow"
		style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
	>
		<LogTable entries={filteredLogsForSelectedDay} selectedRange={logStore.selectedRange} />
	</div>
{/if}
