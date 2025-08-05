import * as d3 from 'd3';
import { exampleLogs } from '../routes/mirth-logs/exampleLogs.js';

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

export type GroupUnit = 'hour' | 'day' | 'month';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export function createLogStore(initialEntries: LogEntry[] = exampleLogs) {
	// Reactive state using Svelte 5 runes
	let entries = $state(initialEntries);
	let websocketEntries = $state<LogEntry[]>([]); // Special variable for WebSocket updates
	let selectedRange = $state<[Date, Date] | null>(null);
	let visibleCount = $state(100);
	let groupUnit = $state<GroupUnit>('hour');
	let selectedLevel = $state<LogLevel | null>(null);

	// D3 time functions
	const rounders = {
		hour: d3.timeHour,
		day: d3.timeDay,
		month: d3.timeMonth
	};

	// Day-specific D3 functions

	// Helper function to get day information

	// Level-filtered entries

	// Timeline grouped data
	let grouped = $derived.by(() => {
		const bucketFn = d3.timeMinute;
		const floor = bucketFn.floor;

		const map = new Map<number, GroupedLog>();

		for (const log of entries) {
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

	// Brush-filtered entries (filtered by selectedRange)
	let filteredEntries = $derived.by(() => {
		if (!selectedRange || selectedRange.length !== 2) {
			return entries;
		}

		const [start, end] = selectedRange.map((d) => d.getTime());

		// Filter grouped data first, then get all logs from those groups
		const filteredGroups = grouped.filter((group) => {
			const groupTime = group.time.getTime();
			return groupTime >= start && groupTime <= end;
		});

		// Get all logs from the filtered groups
		return filteredGroups.flatMap((group) => group.logs);
	});

	// Get day ranges for the data

	// Day list based on all entries

	// Helper function to get day statistics

	// Helper function to group days by month

	// Return public API
	return {
		// Getters for reactive values
		get entries() {
			return entries;
		},
		get websocketEntries() {
			return websocketEntries;
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
		get grouped() {
			return grouped;
		},
		get filteredEntries() {
			return filteredEntries;
		},

		// Setters for state updates
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
			console.log('🔄 logStore.updateEntries called with:', newEntries.length, 'entries');
			entries = newEntries;
			console.log('✅ logStore.entries updated, new length:', entries.length);
		},
		updateWebsocketEntries(newEntries: LogEntry[]) {
			console.log('📡 logStore.updateWebsocketEntries called with:', newEntries.length, 'entries');
			websocketEntries = newEntries;
			console.log('✅ logStore.websocketEntries updated, new length:', websocketEntries.length);
		}
	};
}

// Create and export singleton instance
export const logStore = createLogStore();
