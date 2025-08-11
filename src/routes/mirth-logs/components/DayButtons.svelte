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

	// Props object (keeps reactivity in Svelte 5)
	const props = $props<{
		todaysLiveEntries?: TimelineEntry[];
		onSelectDay?: (date: string) => void;
		days?: DayData[];
		loading?: boolean;
		error?: string | null;
		selectedDay?: string | null;
	}>();

	// Helper to normalize dates for comparison
	function normalizeDate(date: string | null | undefined): string | null {
		if (!date) return null;

		// If it's already in YYYY-MM-DD format, return as is
		if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			return date;
		}

		// Try to parse and convert to YYYY-MM-DD
		try {
			const parsed = new Date(date);
			if (!isNaN(parsed.getTime())) {
				return parsed.toISOString().split('T')[0];
			}
		} catch (e) {
			console.warn('Failed to parse date:', date, e);
		}

		return date;
	}

	// Helper to read current selected day (parent passes a plain string)
	function selectedDayValue(): string | null | undefined {
		console.log('🔍 DayButtons selectedDayValue called:', {
			propsSelectedDay: props.selectedDay,
			selectedDayType: typeof props.selectedDay,
			daysLength: props.days?.length,
			firstDayDate: props.days?.[0]?.date,
			firstDayDateType: typeof props.days?.[0]?.date
		});
		return props.selectedDay ?? null;
	}

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

	// Helper function to check if a day is selected
	function isDaySelected(dayDate: string): boolean {
		const normalizedSelectedDay = normalizeDate(selectedDayValue());
		const normalizedDayDate = normalizeDate(dayDate);
		return normalizedSelectedDay === normalizedDayDate;
	}

	$effect(() => {
		console.log('🔍 SELECTED DAY:', props.selectedDay);
	});
	// No store effects or auto-fetch here; parent drives data
</script>

<div class="space-y-4">
	<!-- Error Display -->
	{#if props.error}
		<div class="rounded-lg border border-red-200 bg-red-50 p-3">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<p class="text-sm text-red-700">{props.error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Loading State -->
	{#if props.loading}
		<div class="flex justify-center py-6">
			<div class="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
		</div>
	{:else if props.days?.length > 0}
		<!-- Days Grid -->
		<div class="flex gap-4 overflow-x-auto px-2 pb-4">
			{#each [...props.days].reverse() as day}
				{@const isSelected = isDaySelected(day.date)}

				<button
					onclick={() => props.onSelectDay?.(day.date)}
					data-selected={isSelected}
					class="w-52 flex-shrink-0 rounded-2xl p-5 text-left transition-all duration-300 disabled:opacity-50"
					style="
						{isSelected
						? 'background-color: var(--color-accent-light); border: 2px solid var(--color-accent); box-shadow: var(--shadow-lg);'
						: 'background-color: var(--color-bg-secondary); border: 2px solid var(--color-border); box-shadow: var(--shadow-sm);'}
					"
				>
					<div class="mb-2 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<h3
								class="text-lg font-bold"
								style="color: {isSelected
									? 'var(--color-accent-dark)'
									: 'var(--color-text-primary)'};"
							>
								{day.date}
							</h3>
							{#if isToday(day.date)}
								<span
									class="rounded-full px-3 py-1.5 text-xs font-semibold"
									style="
										{isSelected
										? 'background-color: var(--color-accent); color: white;'
										: 'background-color: var(--color-accent-light); color: var(--color-accent-dark);'}
									"
								>
									📡 Live
								</span>
							{/if}
						</div>
					</div>

					<div
						class="mb-4 text-sm font-medium"
						style="color: {isSelected
							? 'var(--color-accent-dark)'
							: 'var(--color-text-secondary)'};"
					>
						Total: {day.stats.total.toLocaleString()} logs
						{#if isToday(day.date)}
							<span class="ml-2 text-xs font-normal" style="color: var(--color-accent);"
								>(real-time)</span
							>
						{/if}
					</div>

					<!-- Log Level Stats -->
					<div class="grid grid-cols-2 gap-2">
						<!-- Always show INFO, WARN, ERROR even if 0 -->
						<div
							class="flex items-center justify-between rounded-lg px-3 py-2"
							style="
								{isSelected
								? 'background-color: var(--color-accent-light);'
								: 'background-color: var(--color-bg-tertiary);'}
							"
						>
							<span
								class="text-xs font-semibold"
								style="color: {isSelected
									? 'var(--color-accent-dark)'
									: 'var(--color-text-secondary)'};">INFO</span
							>
							<span
								class="rounded-full px-2 py-1 text-xs font-bold"
								style="
									{isSelected
									? 'background-color: var(--color-accent); color: white;'
									: 'background-color: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);'}
								"
							>
								{(day.stats.INFO || 0).toLocaleString()}
							</span>
						</div>

						<div
							class="flex items-center justify-between rounded-lg px-3 py-2"
							style="
								{isSelected
								? 'background-color: var(--color-accent-light);'
								: 'background-color: var(--color-bg-tertiary);'}
							"
						>
							<span
								class="text-xs font-semibold"
								style="color: {isSelected
									? 'var(--color-accent-dark)'
									: 'var(--color-text-secondary)'};">WARN</span
							>
							<span
								class="rounded-full px-2 py-1 text-xs font-bold"
								style="
									{isSelected
									? 'background-color: var(--color-accent); color: white;'
									: 'background-color: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);'}
								"
							>
								{(day.stats.WARN || 0).toLocaleString()}
							</span>
						</div>

						<div
							class="flex items-center justify-between rounded-lg px-3 py-2"
							style="
								{isSelected
								? 'background-color: var(--color-accent-light);'
								: 'background-color: var(--color-bg-tertiary);'}
							"
						>
							<span
								class="text-xs font-semibold"
								style="color: {isSelected
									? 'var(--color-accent-dark)'
									: 'var(--color-text-secondary)'};">ERROR</span
							>
							<span
								class="rounded-full px-2 py-1 text-xs font-bold"
								style="
									{isSelected
									? 'background-color: var(--color-accent); color: white;'
									: 'background-color: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);'}
								"
							>
								{(day.stats.ERROR || 0).toLocaleString()}
							</span>
						</div>

						<!-- Show other levels only if they exist and have counts > 0 -->
						{#each Object.entries(day.stats) as [level, count]}
							{#if level !== 'total' && level !== 'INFO' && level !== 'WARN' && level !== 'ERROR' && (count as number) > 0}
								<div
									class="flex items-center justify-between rounded px-2 py-1.5 {isSelected
										? 'bg-blue-50 dark:bg-blue-900/30'
										: 'bg-gray-50 dark:bg-gray-700'}"
								>
									<span
										class="text-xs font-medium {isSelected
											? 'text-blue-800 dark:text-blue-200'
											: 'text-gray-700 dark:text-gray-300'}">{level}</span
									>
									<span
										class="rounded-full px-1.5 py-0.5 text-xs font-semibold {isSelected
											? 'bg-blue-500 text-white dark:bg-blue-400 dark:text-gray-900'
											: 'border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-600 dark:text-white'}"
									>
										{(count as number).toLocaleString()}
									</span>
								</div>
							{/if}
						{/each}
					</div>
				</button>
			{/each}
		</div>
	{:else if !props.loading}
		<div class="py-6 text-center text-gray-500 dark:text-gray-400">
			No days found. Make sure the API is working and logs are available.
		</div>
	{/if}
</div>
