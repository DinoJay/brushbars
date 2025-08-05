import * as d3 from 'd3';

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

export function createLogStore(initialEntries: LogEntry[] = []) {
	// Reactive state using Svelte 5 runes
	let entries = $state(initialEntries);
	let websocketEntries = $state<LogEntry[]>([]); // Special variable for WebSocket updates
	let selectedRange = $state<[Date, Date] | null>(null);
	let visibleCount = $state(100);
	let groupUnit = $state<GroupUnit>('hour');
	let selectedLevel = $state<LogLevel | null>(null);
	let selectedChannel = $state<string | null>(null);
	let selectedDay = $state<string | null>(new Date().toISOString().split('T')[0]); // Initialize with today

	// D3 time functions
	const rounders = {
		hour: d3.timeHour,
		day: d3.timeDay,
		month: d3.timeMonth
	};

	// Day-specific D3 functions

	// Helper function to get day information

	// Level-filtered entries

	// Day-filtered entries (filtered by selectedDay)
	let dayFilteredEntries = $derived.by(() => {
		// First, combine entries and websocket entries
		const allEntries = [...entries, ...websocketEntries];

		// If no day is selected, return all entries
		if (!selectedDay) {
			console.log('🔍 Store Debug - No day selected, returning all entries:', allEntries.length);
			return allEntries;
		}

		// Filter entries by the selected day
		const filtered = allEntries.filter((log) => {
			const logDate = new Date(log.timestamp).toISOString().split('T')[0];
			return logDate === selectedDay;
		});

		console.log('🔍 Store Debug - Selected Day:', selectedDay);
		console.log('🔍 Store Debug - Total Entries:', allEntries.length);
		console.log('🔍 Store Debug - Historical Entries:', entries.length);
		console.log('🔍 Store Debug - WebSocket Entries:', websocketEntries.length);
		console.log('🔍 Store Debug - Filtered Entries:', filtered.length);

		return filtered;
	});

	// Timeline grouped data (from day-filtered entries)
	let grouped = $derived.by(() => {
		const bucketFn = d3.timeMinute;
		const floor = bucketFn.floor;

		const map = new Map<number, GroupedLog>();

		// Use dayFilteredEntries instead of all entries
		for (const log of dayFilteredEntries) {
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

	// Final filtered entries (day + brush + level + channel filtered)
	let filteredEntries = $derived.by(() => {
		let filtered = dayFilteredEntries;

		// Apply level filter
		if (selectedLevel) {
			filtered = filtered.filter((log) => log.level === selectedLevel);
		}

		// Apply channel filter
		if (selectedChannel) {
			filtered = filtered.filter((log) => log.channel === selectedChannel);
		}

		// If there's a brush selection, filter by time range
		if (selectedRange && selectedRange.length === 2) {
			const [start, end] = selectedRange.map((d) => d.getTime());

			// Filter grouped data by time range
			const filteredGroups = grouped.filter((group) => {
				const groupTime = group.time.getTime();
				return groupTime >= start && groupTime <= end;
			});

			// Get all logs from the filtered groups and apply level/channel filters
			const timeFilteredLogs = filteredGroups.flatMap((group) => group.logs);

			// Apply level and channel filters to time-filtered logs
			if (selectedLevel) {
				filtered = timeFilteredLogs.filter((log) => log.level === selectedLevel);
			} else {
				filtered = timeFilteredLogs;
			}

			if (selectedChannel) {
				filtered = filtered.filter((log) => log.channel === selectedChannel);
			}
		}

		return filtered;
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
		get selectedChannel() {
			return selectedChannel;
		},
		get selectedDay() {
			return selectedDay;
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
		get dayFilteredEntries() {
			return dayFilteredEntries;
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
		setSelectedChannel(channel: string | null) {
			selectedChannel = channel;
		},
		setSelectedDay(day: string | null) {
			selectedDay = day;
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
		},
		getCurrentDate() {
			return new Date().toISOString().split('T')[0];
		}
	};
}

// Create and export singleton instance
export const logStore = createLogStore();
