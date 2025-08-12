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

	// Show month + day (and year only when different from current year)
	function formatDayTitle(date: string): string {
		try {
			const d = new Date(date);
			if (!isNaN(d.getTime())) {
				const base = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
				const currentYear = new Date().getFullYear();
				return d.getFullYear() === currentYear ? base : `${base} ${d.getFullYear()}`;
			}
		} catch {
			// fall through
		}
		return date;
	}

	// Ensure today is present in the list (with zero stats) so user can always select it
	const effectiveDays = $derived.by(() => {
		const list = Array.isArray(props.days) ? [...props.days] : ([] as DayData[]);
		const today = getCurrentDate();

		// Always get live entries for today
		const live = Array.isArray(props.todaysLiveEntries)
			? (props.todaysLiveEntries as TimelineEntry[])
			: ([] as TimelineEntry[]);

		// Calculate stats from live + stored entries for today
		let info = 0;
		let warn = 0;
		let error = 0;
		let debug = 0;

		// Union of stored today's stats (if present) + live entries
		const storedToday = list.find((d) => normalizeDate(d?.date) === today);
		if (storedToday) {
			info += storedToday.stats?.INFO || 0;
			warn += storedToday.stats?.WARN || 0;
			error += storedToday.stats?.ERROR || 0;
			debug += storedToday.stats?.DEBUG || 0;
		}

		for (const entry of live) {
			const raw = String((entry as any).level || '').toUpperCase();
			let norm = raw;
			if (['SENT', 'RECEIVED', 'PROCESSED', 'SUCCESS', 'OK', 'ACK'].includes(raw)) norm = 'INFO';
			else if (['WARN', 'WARNING', 'PENDING', 'QUEUED'].includes(raw)) norm = 'WARN';
			else if (['ERROR', 'FAILED', 'FAIL', 'NACK'].includes(raw)) norm = 'ERROR';
			else if (['DEBUG', 'TRACE'].includes(raw)) norm = 'DEBUG';
			switch (norm) {
				case 'INFO':
					info += 1;
					break;
				case 'WARN':
					warn += 1;
					break;
				case 'ERROR':
					error += 1;
					break;
				case 'DEBUG':
					debug += 1;
					break;
			}
		}

		// Create a new list with updated today stats
		const updatedList = list.map((day) => {
			if (normalizeDate(day.date) === today) {
				// Return updated today with live stats
				return {
					...day,
					stats: {
						total: info + warn + error + debug,
						INFO: info,
						ERROR: error,
						WARN: warn,
						DEBUG: debug
					}
				};
			}
			return day;
		});

		// If today doesn't exist, add it
		if (!updatedList.some((day) => normalizeDate(day.date) === today)) {
			updatedList.push({
				date: today,
				formattedDate: today,
				stats: {
					total: info + warn + error + debug,
					INFO: info,
					ERROR: error,
					WARN: warn,
					DEBUG: debug
				}
			});
		}

		// Keep chronological order so downstream reverse() shows latest first
		return updatedList.sort((a, b) => a.date.localeCompare(b.date));
	});

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
	{:else if effectiveDays.length > 0}
		<!-- Days Grid -->
		<div class="flex gap-3 overflow-x-auto px-2 pb-3">
			{#each [...effectiveDays].reverse() as day}
				{@const isSelected = isDaySelected(day.date)}

				<button
					onclick={() => props.onSelectDay?.(day.date)}
					data-selected={isSelected}
					class="w-44 flex-shrink-0 rounded-2xl p-4 text-left transition-all duration-300 disabled:opacity-50"
					style="
						{isSelected
						? 'background-color: var(--color-accent-light); border: 2px solid var(--color-accent); box-shadow: var(--shadow-lg);'
						: 'background-color: var(--color-bg-secondary); border: 2px solid var(--color-border); box-shadow: var(--shadow-sm);'}
					"
				>
					<div class="mb-1.5 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<h3
								class="text-base font-bold"
								style="color: {isSelected
									? 'var(--color-accent-dark)'
									: 'var(--color-text-primary)'};"
							>
								{formatDayTitle(day.date)}
							</h3>
							{#if isToday(day.date)}
								<div
									class="flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
									style="
                                        {isSelected
										? 'background-color: var(--color-accent); color: white;'
										: 'background-color: var(--color-accent-light); color: var(--color-accent-dark);'}
                                    "
								>
									<div class="flex flex-col items-center gap-1">
										<div>📡</div>
									</div>
								</div>
							{/if}
						</div>
					</div>

					<div
						class="mb-3 text-xs font-medium"
						style="color: {isSelected
							? 'var(--color-accent-dark)'
							: 'var(--color-text-secondary)'};"
					>
						Total: {day.stats.total.toLocaleString()} logs
					</div>

					<!-- Log Level Stats -->
					<div class="flex flex-col gap-2">
						<!-- Always show INFO, WARN, ERROR even if 0 -->
						<div
							class="flex items-center justify-between rounded-lg px-3 py-1.5"
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
								class="rounded-full px-2 py-0.5 text-[11px] font-bold"
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
							class="flex items-center justify-between rounded-lg px-3 py-1.5"
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
								class="rounded-full px-2 py-0.5 text-[11px] font-bold"
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
							class="flex items-center justify-between rounded-lg px-3 py-1.5"
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
								class="rounded-full px-2 py-0.5 text-[11px] font-bold"
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
									class="flex items-center justify-between rounded px-2 py-1.5"
									style="
                                        {isSelected
										? 'background-color: var(--color-accent-light);'
										: 'background-color: var(--color-bg-tertiary);'}
                                    "
								>
									<span
										class="text-xs font-medium"
										style="color: {isSelected
											? 'var(--color-accent-dark)'
											: 'var(--color-text-secondary)'};">{level}</span
									>
									<span
										class="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
										style="
                                            {isSelected
											? 'background-color: var(--color-accent); color: white;'
											: 'background-color: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border);'}
                                        "
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
		<div class="py-6 text-center" style="color: var(--color-text-secondary);">
			No days found. Make sure the API is working and logs are available.
		</div>
	{/if}
</div>
