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

	const props = $props<{ loading?: boolean }>();

	// Local loading flag when fetching a specific day inside this wrapper
	let isFetchingDay = $state(false);

	// Get selected day directly from URL
	function selectedDayFromUrl() {
		return $page.url.searchParams.get('day');
	}

	// Reset filters/brush when day changes
	let prevDay = $state<string | null>(null);
	$effect(() => {
		const day = selectedDayFromUrl();
		if (day && day !== prevDay) {
			prevDay = day;
			logStore.setSelectedLevel(null);
			logStore.setSelectedChannel(null);
			logStore.setSelectedRange(null);
		}
	});

	async function handleSelectDay(date: string) {
		// Update URL directly - selectedDay will automatically update via $derived
		const url = new URL(window.location.href);
		url.searchParams.set('day', date);
		await goto(url.pathname + '?' + url.searchParams.toString(), {
			replaceState: false,
			noScroll: true,
			keepFocus: true
		});

		// Clear filters and brush immediately on day change
		logStore.setSelectedLevel(null);
		logStore.setSelectedChannel(null);
		logStore.setSelectedRange(null);

		await fetchDataForDay(date);
	}

	// Fetch data for a specific day
	async function fetchDataForDay(day: string) {
		if (!day) return;

		try {
			isFetchingDay = true;
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
		} finally {
			isFetchingDay = false;
		}
	}

	const normalizeChannelName = (name: string | null | undefined) =>
		name
			? String(name)
					.trim()
					.replace(/\s*\([^)]*\)\s*$/, '')
					.toUpperCase()
			: '';
	const showSpinner = $derived.by(
		() => logStore.loadingDays || !(logStore.devLogDays && logStore.devLogDays.length)
	);

	// When days are loading, replace the entire lower half (timeline + table)
	const daysLoading = $derived.by(
		() =>
			props.loading || logStore.loadingDays || !(logStore.devLogDays && logStore.devLogDays.length)
	);

	// Smart timeline data sourced from store (merged stored + live, filtered by level/channel)
	const timelineDataForSelectedDay = $derived.by(() => {
		const day = selectedDayFromUrl();
		return day ? (logStore as any).getTimelineDevEntriesForDay(day) : ([] as any[]);
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

	// Entries used by LogFilters: merged (stored + live) but restricted to the selected day
	const filterEntriesForSelectedDay = $derived.by(() => {
		const day = selectedDayFromUrl();
		return day ? (logStore as any).getDevFilterEntriesForDay(day) : ([] as any[]);
	});
</script>

<div
	class="mb-4 flex overflow-auto rounded p-3 shadow"
	style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
>
	<div class="flex overflow-auto">
		<DayButtons
			selectedDay={selectedDayFromUrl()}
			todaysLiveEntries={logStore.liveDevLogEntries}
			days={logStore.devLogDays}
			loading={logStore.loadingDays}
			error={logStore.errorDays}
			onSelectDay={handleSelectDay}
		/>
	</div>
</div>

<div class="flex flex-1 flex-col">
	{#if !(props.loading || isFetchingDay)}
		<LogFilters
			entries={filterEntriesForSelectedDay}
			onFiltersChange={(l, c) => {
				logStore.setSelectedLevel(l as any);
				logStore.setSelectedChannel(c);
			}}
		/>
	{/if}

	<div
		class="mb-4 flex flex-1 flex-col rounded p-3 shadow"
		style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
	>
		{#if showSpinner || props.loading || isFetchingDay}
			<LoadingSpinner class="m-auto" label="Loading timeline…" size={44} />
		{:else}
			<div class="w-full">
				<MirthActivityTimeline
					entries={timelineDataForSelectedDay}
					onRangeChange={(r) => logStore.setSelectedRange(r)}
					resetOn={`${selectedDayFromUrl() || ''}|${logStore.selectedChannel || ''}`}
				/>
			</div>
		{/if}
	</div>

	{#if !(showSpinner || props.loading || isFetchingDay)}
		<div
			class="rounded p-3 shadow"
			style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
		>
			<LogTable entries={filteredLogsForSelectedDay} selectedRange={logStore.selectedRange} />
		</div>
	{/if}
</div>
