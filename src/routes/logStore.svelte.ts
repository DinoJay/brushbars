import * as d3 from 'd3';
import { exampleLogs } from './exampleLogs.js';

// Define types
export interface LogEntry {
	id: number;
	level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
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

// Class-based store following the pattern from the referenced repository
export class LogStore {
	// Private state using runes
	private _entries = $state<LogEntry[]>(exampleLogs as LogEntry[]);
	private _selectedMonth = $state<string>('all');
	private _selectedRange = $state<[Date, Date] | null>(null);
	private _visibleCount = $state<number>(100);
	private _groupUnit = $state<GroupUnit>('hour');
	private _selectedLevel = $state<LogLevel | null>(null);

	// Constants
	public readonly rounders = {
		hour: d3.timeHour,
		day: d3.timeDay,
		week: d3.timeWeek,
		month: d3.timeMonth
	} as const;

	// Derived values using runes
	public readonly availableMonths = $derived.by(() => {
		const months = new Set<string>();
		months.add('all'); // Always include 'all' option

		this._entries.forEach((entry) => {
			const date = new Date(entry.timestamp);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			months.add(monthKey);
		});

		return Array.from(months).sort();
	});

	public readonly monthFilteredEntries = $derived.by(() => {
		if (this._selectedMonth === 'all') {
			return this._entries;
		}

		const [year, month] = this._selectedMonth.split('-').map(Number);
		return this._entries.filter((entry) => {
			const date = new Date(entry.timestamp);
			return date.getFullYear() === year && date.getMonth() + 1 === month;
		});
	});

	public readonly levelFilteredEntries = $derived.by(() => {
		if (!this._selectedLevel) {
			return this.monthFilteredEntries;
		}

		return this.monthFilteredEntries.filter((entry) => {
			return entry.level === this._selectedLevel;
		});
	});

	// Timeline grouped data - always shows all bars regardless of any filters (month, level, or brush)
	public readonly grouped = $derived.by(() => {
		const bucketFn = this.rounders[this._groupUnit] ?? d3.timeHour;
		const floor = bucketFn.floor;

		const map = new Map<number, GroupedLog>();

		// Use full _entries to show all bars in timeline, regardless of any filters
		for (const log of this._entries) {
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

	// Filtered entries for table - respects level filter
	public readonly filteredEntries = $derived.by(() => {
		const start = this._selectedRange?.[0]?.getTime?.() ?? -Infinity;
		const end = this._selectedRange?.[1]?.getTime?.() ?? Infinity;

		const bucketFn = this.rounders[this._groupUnit] ?? d3.timeHour;

		// Use levelFilteredEntries for table data
		const filtered = this.levelFilteredEntries.filter((e) => {
			const ts = bucketFn(new Date(e.timestamp));
			return ts.getTime() >= start && ts.getTime() <= end;
		});

		return filtered;
	});

	public readonly filteredEntriesWithoutRange = $derived.by(() => this.levelFilteredEntries);

	// Public getters for reactive access
	public get entries() {
		return this._entries;
	}
	public get selectedMonth() {
		return this._selectedMonth;
	}
	public get selectedRange() {
		return this._selectedRange;
	}
	public get visibleCount() {
		return this._visibleCount;
	}
	public get groupUnit() {
		return this._groupUnit;
	}
	public get selectedLevel() {
		return this._selectedLevel;
	}

	// Public methods for updating state
	public setSelectedMonth(month: string): void {
		this._selectedMonth = month;
	}

	public setSelectedRange(range: [Date, Date] | null): void {
		this._selectedRange = range;
	}

	public setGroupUnit(unit: GroupUnit): void {
		this._groupUnit = unit;
	}

	public setSelectedLevel(level: LogLevel | null): void {
		this._selectedLevel = level;
	}

	public clearFilters(): void {
		this._selectedMonth = 'all';
		this._selectedRange = null;
		this._selectedLevel = null;
	}

	public updateEntries(entries: LogEntry[]): void {
		this._entries = entries;
	}

	// Initialize with current month
	constructor() {
		const currentDate = new Date();
		const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
		this._selectedMonth = currentMonth;
	}
}

// Create and export a singleton instance
export const logStore = new LogStore();

// Export individual reactive values for backward compatibility
export const entries = logStore.entries;
export const selectedMonth = logStore.selectedMonth;
export const selectedRange = logStore.selectedRange;
export const visibleCount = logStore.visibleCount;
export const groupUnit = logStore.groupUnit;
export const selectedLevel = logStore.selectedLevel;
export const availableMonths = logStore.availableMonths;
export const monthFilteredEntries = logStore.monthFilteredEntries;
export const levelFilteredEntries = logStore.levelFilteredEntries;
export const filteredEntries = logStore.filteredEntries;
export const grouped = logStore.grouped;
export const filteredEntriesWithoutRange = logStore.filteredEntriesWithoutRange;
export const rounders = logStore.rounders;

// Export utility functions for backward compatibility
export function setSelectedMonth(month: string): void {
	logStore.setSelectedMonth(month);
}

export function setSelectedRange(range: [Date, Date] | null): void {
	logStore.setSelectedRange(range);
}

export function setGroupUnit(unit: GroupUnit): void {
	logStore.setGroupUnit(unit);
}

export function setSelectedLevel(level: LogLevel | null): void {
	logStore.setSelectedLevel(level);
}

export function clearFilters(): void {
	logStore.clearFilters();
}
