<!-- runes -->
<script lang="ts">
	import type { TimelineEntry } from '$lib/types';

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

	// All loading/error passed from parent; no internal fetching here

	// Props: today's live entries are only used to recompute today's stats
	const {
		todaysLiveEntries = [] as TimelineEntry[],
		onSelectDay = null,
		days = [],
		loading = false,
		error = null,
		selectedDay = null
	} = $props<{
		todaysLiveEntries?: TimelineEntry[];
		onSelectDay?: (date: string) => void;
		days?: DayData[];
		loading?: boolean;
		error?: string | null;
		selectedDay: string | null;
	}>();

	// Bindable selectedDay to support bind:selectedDay on parent

	// Reactive derived value that automatically updates stats based on filtered entries
	let reactiveDays = $derived.by(() => {
		return days;
	});

	// Get current date in YYYY-MM-DD format
	function getCurrentDate(): string {
		return new Date().toISOString().split('T')[0];
	}

	// Check if a date is today
	function isToday(date: string): boolean {
		return date === getCurrentDate();
	}

	// Get color for log level

	// Get badge for current day indicator (pure)
	function getCurrentDayBadge(date: string, isSelected: boolean = false): string {
		if (isToday(date)) {
			if (isSelected) {
				return 'bg-blue-100 text-blue-800 border border-blue-300';
			}
			return 'bg-green-100 text-green-800 border border-green-300';
		}
		return '';
	}

	// No store effects or auto-fetch here; parent drives data
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
			{#each [...reactiveDays].reverse() as day}
				<button
					onclick={() => {
						onSelectDay?.(day.date);
					}}
					data-selected={selectedDay === day.date}
					class="w-64 flex-shrink-0 rounded-lg border p-4 text-left transition-all disabled:opacity-50 {selectedDay ===
					day.date
						? 'border-blue-600 bg-blue-50 shadow-lg ring-2 ring-blue-500'
						: 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50 hover:shadow-lg'}"
				>
					<div class="mb-3 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<h3
								class="text-lg font-semibold {selectedDay === day.date
									? 'text-blue-900'
									: 'text-gray-900'}"
							>
								{day.date}
							</h3>
							{#if isToday(day.date)}
								<span
									class="rounded-full px-3 py-1 text-xs font-medium {getCurrentDayBadge(
										day.date,
										selectedDay === day.date
									)}"
								>
									📡 Live
								</span>
							{/if}
						</div>
					</div>

					<div
						class="mb-4 text-base font-medium {selectedDay === day.date
							? 'text-blue-800'
							: 'text-gray-700'}"
					>
						Total: {day.stats.total.toLocaleString()} logs
						{#if isToday(day.date)}
							<span class="ml-2 text-sm font-normal text-green-600">(real-time)</span>
						{/if}
					</div>

					<!-- Log Level Stats -->
					<div class="grid grid-cols-2 gap-2">
						{#each Object.entries(day.stats) as [level, count]}
							{#if level !== 'total' && count > 0}
								<div
									class="flex items-center justify-between rounded-md px-3 py-2 {selectedDay ===
									day.date
										? 'bg-blue-100'
										: 'bg-gray-50'}"
								>
									<span
										class="text-sm font-medium {selectedDay === day.date
											? 'text-blue-900'
											: 'text-gray-700'}">{level}</span
									>
									<span
										class="rounded-full px-2 py-1 text-xs font-semibold shadow-sm {selectedDay ===
										day.date
											? 'bg-blue-200 text-blue-900'
											: 'bg-white text-gray-900'}"
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
