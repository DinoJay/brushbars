import * as d3 from 'd3';
import { exampleLogs } from './exampleLogs.js';

export interface LogEntry {
	id: number;
	level: string;
	timestamp: string;
	channel: string;
	message: string;
}

export interface GroupedLog {
	time: Date;
	count: number;
	levels: Record<string, number>;
	logs: LogEntry[];
}

export type GroupUnit = 'hour' | 'day' | 'week' | 'month';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export function createLogStore(initialEntries: LogEntry[] = exampleLogs) {
	// Reactive state using Svelte 5 runes
	let entries = $state(initialEntries);
	let selectedMonth = $state(getCurrentMonth());
	let selectedRange = $state<[Date, Date] | null>(null);
	let visibleCount = $state(100);
	let groupUnit = $state<GroupUnit>('hour');
	let selectedLevel = $state<LogLevel | null>(null);

	// D3 time functions
	const rounders = {
		hour: d3.timeHour,
		day: d3.timeDay,
		week: d3.timeWeek,
		month: d3.timeMonth
	};

	// Helper function
	function getCurrentMonth(): string {
		const currentDate = new Date();
		return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
	}

	// Computed values using Svelte 5 runes
	let availableMonths = $derived.by(() => {
		const months = new Set<string>();
		months.add('all'); // Always include 'all' option

		entries.forEach((entry) => {
			const date = new Date(entry.timestamp);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			months.add(monthKey);
		});

		return Array.from(months).sort();
	});

	let monthFilteredEntries = $derived.by(() => {
		console.log('Month filtering with selectedMonth:', selectedMonth);
		if (selectedMonth === 'all') {
			console.log('Returning all entries:', entries.length);
			return entries;
		}

		const [year, month] = selectedMonth.split('-').map(Number);
		const filtered = entries.filter((entry) => {
			const date = new Date(entry.timestamp);
			return date.getFullYear() === year && date.getMonth() + 1 === month;
		});
		console.log('Filtered entries for month:', filtered.length);
		return filtered;
	});

	let levelFilteredEntries = $derived.by(() => {
		if (!selectedLevel) {
			return monthFilteredEntries;
		}
		return monthFilteredEntries.filter((entry: LogEntry) => entry.level === selectedLevel);
	});

	// Timeline grouped data - shows bars based on month filter
	let grouped = $derived.by(() => {
		const bucketFn = rounders[groupUnit] ?? d3.timeHour;
		const floor = bucketFn.floor;

		const map = new Map<number, GroupedLog>();

		// Use monthFilteredEntries to show bars based on selected month
		for (const log of monthFilteredEntries) {
			const bucketTime = floor(new Date(log.timestamp));
			const key = bucketTime.getTime();

			if (!map.has(key)) {
				map.set(key, {
					time: bucketTime,
					count: 0,
					levels: {},
					logs: []
				});
			}

			const group = map.get(key)!;
			const level = log.level || 'UNKNOWN';

			group.count++;
			group.levels[level] = (group.levels[level] || 0) + 1;
			group.logs.push(log);
		}

		return Array.from(map.values()).sort((a, b) => a.time.getTime() - b.time.getTime());
	});

	let filteredEntries = $derived.by(() => {
		if (!selectedRange || selectedRange.length !== 2) {
			return levelFilteredEntries;
		}

		const [start, end] = selectedRange.map((d) => d.getTime());

		// Filter grouped data first, then get all logs from those groups
		const filteredGroups = grouped.filter((group) => {
			const groupTime = group.time.getTime();
			return groupTime >= start && groupTime <= end;
		});

		// Get all logs from the filtered groups, but only include those that pass level filter
		const logsFromFilteredGroups = filteredGroups.flatMap((group) => group.logs);

		// Apply level filter to the logs from filtered groups
		if (!selectedLevel) {
			return logsFromFilteredGroups;
		}

		return logsFromFilteredGroups.filter((log) => log.level === selectedLevel);
	});

	let filteredEntriesWithoutRange = $derived.by(() => levelFilteredEntries);

	// Return public API
	return {
		// Getters for reactive values
		get entries() {
			return entries;
		},
		get selectedMonth() {
			return selectedMonth;
		},
		get selectedRange() {
			return selectedRange;
		},
		get visibleCount() {
			return visibleCount;
		},
		get groupUnit() {
			return groupUnit;
		},
		get selectedLevel() {
			return selectedLevel;
		},
		get rounders() {
			return rounders;
		},

		// Computed values
		get availableMonths() {
			return availableMonths;
		},
		get monthFilteredEntries() {
			return monthFilteredEntries;
		},
		get levelFilteredEntries() {
			return levelFilteredEntries;
		},
		get filteredEntries() {
			return filteredEntries;
		},
		get grouped() {
			return grouped;
		},
		get filteredEntriesWithoutRange() {
			return filteredEntriesWithoutRange;
		},

		// Setters for state updates
		setSelectedMonth(month: string) {
			console.log('Setting selectedMonth to:', month);
			selectedMonth = month;
		},
		setSelectedRange(range: [Date, Date] | null) {
			selectedRange = range;
		},
		setVisibleCount(count: number) {
			visibleCount = count;
		},
		setGroupUnit(unit: GroupUnit) {
			groupUnit = unit;
		},
		setSelectedLevel(level: LogLevel | null) {
			selectedLevel = level;
		},
		updateEntries(newEntries: LogEntry[]) {
			entries = newEntries;
		},
		clearFilters() {
			selectedMonth = getCurrentMonth();
			selectedRange = null;
			selectedLevel = null;
		}
	};
}

// Create and export singleton instance
export const logStore = createLogStore();
