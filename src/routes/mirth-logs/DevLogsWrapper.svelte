<!-- runes -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DayButtons from '$components/DayButtons.svelte';
	import LogFilters from '$components/LogFilters.svelte';
	import MirthActivityTimeline from '$components/timeline/MirthActivityTimeline.svelte';
	import LogTable from '$components/LogTable.svelte';
	import { logStore } from '$stores/logStore.svelte';

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

		// Fetch data for the selected day
		await fetchDataForDay(date);
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
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"
			></div>
			<p class="text-gray-600">Loading days…</p>
		</div>
	</div>
{:else}
	<div class="mb-6 rounded bg-white p-4 shadow">
		<DayButtons
			selectedDay={selectedDayFromUrl()}
			todaysLiveEntries={[]}
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

	<div class="mb-6 rounded bg-white p-4 shadow">
		<MirthActivityTimeline
			entries={logStore.timelineDevLogs}
			onRangeChange={(r) => logStore.setSelectedRange(r)}
			resetOn={`${selectedDayFromUrl() || ''}|${logStore.selectedChannel || ''}`}
		/>
	</div>
	<div class="rounded bg-white p-4 shadow">
		<LogTable entries={filteredLogsForSelectedDay} selectedRange={logStore.selectedRange} />
	</div>
{/if}
