import { writable, derived, type Writable, type Readable } from 'svelte/store';
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
	private _entries: Writable<LogEntry[]>;
	private _selectedMonth: Writable<string>;
	private _selectedRange: Writable<[Date, Date] | null>;
	private _visibleCount: Writable<number>;
	private _groupUnit: Writable<GroupUnit>;
	private _selectedLevel: Writable<LogLevel | null>;

	// Public readonly stores
	public readonly entries: Readable<LogEntry[]>;
	public readonly selectedMonth: Readable<string>;
	public readonly selectedRange: Readable<[Date, Date] | null>;
	public readonly visibleCount: Readable<number>;
	public readonly groupUnit: Readable<GroupUnit>;
	public readonly selectedLevel: Readable<LogLevel | null>;

	// Derived stores
	public readonly availableMonths: Readable<string[]>;
	public readonly monthFilteredEntries: Readable<LogEntry[]>;
	public readonly levelFilteredEntries: Readable<LogEntry[]>;
	public readonly filteredEntries: Readable<LogEntry[]>;
	public readonly grouped: Readable<GroupedLog[]>;
	public readonly filteredEntriesWithoutRange: Readable<LogEntry[]>;

	// Constants
	public readonly rounders = {
		hour: d3.timeHour,
		day: d3.timeDay,
		week: d3.timeWeek,
		month: d3.timeMonth
	} as const;

	constructor() {
		// Initialize private writable stores
		this._entries = writable<LogEntry[]>(exampleLogs as LogEntry[]);

		// Preselect current month
		const currentDate = new Date();
		const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
		this._selectedMonth = writable<string>(currentMonth);

		this._selectedRange = writable<[Date, Date] | null>(null);
		this._visibleCount = writable<number>(100);
		this._groupUnit = writable<GroupUnit>('hour');
		this._selectedLevel = writable<LogLevel | null>(null);

		// Expose readonly versions
		this.entries = this._entries;
		this.selectedMonth = this._selectedMonth;
		this.selectedRange = this._selectedRange;
		this.visibleCount = this._visibleCount;
		this.groupUnit = this._groupUnit;
		this.selectedLevel = this._selectedLevel;

		// Create derived stores
		this.availableMonths = derived(this._entries, ($entries) => {
			const months = new Set<string>();
			months.add('all'); // Always include 'all' option

			$entries.forEach((entry) => {
				const date = new Date(entry.timestamp);
				const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
				months.add(monthKey);
			});

			return Array.from(months).sort();
		});

		this.monthFilteredEntries = derived(
			[this._entries, this._selectedMonth],
			([$entries, $selectedMonth]) => {
				if ($selectedMonth === 'all') {
					return $entries;
				}

				const [year, month] = $selectedMonth.split('-').map(Number);
				return $entries.filter((entry) => {
					const date = new Date(entry.timestamp);
					return date.getFullYear() === year && date.getMonth() + 1 === month;
				});
			}
		);

		this.levelFilteredEntries = derived(
			[this.monthFilteredEntries, this._selectedLevel],
			([$monthFilteredEntries, $selectedLevel]) => {
				if (!$selectedLevel) {
					return $monthFilteredEntries;
				}

				return $monthFilteredEntries.filter((entry) => {
					return entry.level === $selectedLevel;
				});
			}
		);

		this.filteredEntries = derived(
			[this.levelFilteredEntries, this._selectedRange, this._groupUnit],
			([$levelFilteredEntries, $range, $unit]) => {
				const start = $range?.[0]?.getTime?.() ?? -Infinity;
				const end = $range?.[1]?.getTime?.() ?? Infinity;
				console.log('start', $range?.[0], 'end', $range?.[1], 'unit', $unit);

				const bucketFn = this.rounders[$unit] ?? d3.timeHour;

				const filtered = $levelFilteredEntries.filter((e) => {
					const ts = bucketFn(new Date(e.timestamp));
					return ts.getTime() >= start && ts.getTime() <= end;
				});
				console.log('filtered', filtered);
				return filtered;
			}
		);

		this.grouped = derived(
			[this.levelFilteredEntries, this._groupUnit],
			([$levelFilteredEntries, $unit]) => {
				const bucketFn = this.rounders[$unit] ?? d3.timeHour;
				const floor = bucketFn.floor;

				const map = new Map<number, GroupedLog>();

				for (const log of $levelFilteredEntries) {
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
			}
		);

		this.filteredEntriesWithoutRange = derived(
			this.levelFilteredEntries,
			($levelFilteredEntries) => $levelFilteredEntries
		);
	}

	// Public methods for updating state
	public setSelectedMonth(month: string): void {
		this._selectedMonth.set(month);
	}

	public setSelectedRange(range: [Date, Date] | null): void {
		this._selectedRange.set(range);
	}

	public setGroupUnit(unit: GroupUnit): void {
		this._groupUnit.set(unit);
	}

	public setSelectedLevel(level: LogLevel | null): void {
		this._selectedLevel.set(level);
	}

	public clearFilters(): void {
		this._selectedMonth.set('all');
		this._selectedRange.set(null);
		this._selectedLevel.set(null);
	}

	public updateEntries(entries: LogEntry[]): void {
		this._entries.set(entries);
	}
}

// Create and export a singleton instance
export const logStore = new LogStore();

// Export individual stores for backward compatibility
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
