import * as d3 from 'd3';

export interface LogEntry {
	id: number;
	level: string;
	timestamp: string;
	channel: string;
	message: string;
}

export interface DayData {
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
	logs?: LogEntry[]; // Individual logs for this day
}

export type GroupUnit = 'hour' | 'day' | 'month';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export function createLogStore(initialEntries: LogEntry[] = []) {
	// Helper function to safely parse dates
	function safeParseDate(timestamp: string): Date | null {
		try {
			const date = new Date(timestamp);
			return isNaN(date.getTime()) ? null : date;
		} catch {
			return null;
		}
	}

	// Helper function to safely get date string
	function safeGetDateString(timestamp: string): string | null {
		const date = safeParseDate(timestamp);
		return date ? date.toISOString().split('T')[0] : null;
	}

	// Reactive state using Svelte 5 runes
	let entries = $state(initialEntries);
	let liveDevLogEntries = $state<LogEntry[]>([]); // Live dev logs streamed via WebSocket
	let messageLogEntries = $state<LogEntry[]>([]); // Channel messages loaded via API
	let allLogsFromDays = $state<LogEntry[]>([]); // All logs from the days API
	let selectedRange = $state<[Date, Date] | null>(null);
	let visibleCount = $state(100);
	let groupUnit = $state<GroupUnit>('hour');
	let selectedLevel = $state<LogLevel | null>(null);
	let selectedChannel = $state<string | null>(null);
	let selectedDay = $state<string | null>(new Date().toISOString().split('T')[0]); // Initialize with today

	// Days state for both logs and messages
	let logDays = $state<DayData[]>([]);
	let messageDays = $state<DayData[]>([]);
	let loadingDays = $state(false);
	let errorDays = $state<string | null>(null);

	// D3 time functions
	const rounders = {
		hour: d3.timeHour,
		day: d3.timeDay,
		month: d3.timeMonth
	};

	// Day-specific D3 functions

	// Helper function to get day information

	// Level-filtered entries

	// All dev log entries (with all filters including day)
	let allDevLogEntries = $derived.by(() => {
		// Combine logs from days API with live WebSocket entries
		const allEntries = [...allLogsFromDays, ...liveDevLogEntries];
		let filtered = allEntries;

		// Apply day filter
		if (selectedDay) {
			filtered = filtered.filter((log) => {
				const logDate = safeGetDateString(log.timestamp);
				return logDate === selectedDay;
			});
		}

		// Apply time range (brush) filter
		if (selectedRange && selectedRange.length === 2) {
			const [start, end] = selectedRange;
			const startMs = start.getTime();
			const endMs = end.getTime();
			filtered = filtered.filter((log) => {
				const ts = new Date(log.timestamp).getTime();
				return ts >= startMs && ts <= endMs;
			});
		}

		// Apply level filter
		if (selectedLevel) {
			filtered = filtered.filter((log) => log.level === selectedLevel);
		}

		// Apply channel filter
		if (selectedChannel) {
			filtered = filtered.filter((log) => log.channel === selectedChannel);
		}

		return filtered;
	});

	// All message entries (with all filters including day)
	let allMessageEntries = $derived.by(() => {
		// Combine message entries with live WebSocket entries
		const allEntries = [...messageLogEntries, ...liveDevLogEntries];
		let filtered = allEntries;

		// Apply day filter
		if (selectedDay) {
			filtered = filtered.filter((log) => {
				const logDate = safeGetDateString(log.timestamp);
				return logDate === selectedDay;
			});
		}

		// Apply time range (brush) filter
		if (selectedRange && selectedRange.length === 2) {
			const [start, end] = selectedRange;
			const startMs = start.getTime();
			const endMs = end.getTime();
			filtered = filtered.filter((log) => {
				const date = safeParseDate(log.timestamp);
				if (!date) return false;
				const ts = date.getTime();
				return ts >= startMs && ts <= endMs;
			});
		}

		// Apply level filter
		if (selectedLevel) {
			filtered = filtered.filter((log) => log.level === selectedLevel);
		}

		// Apply channel filter
		if (selectedChannel) {
			filtered = filtered.filter((log) => log.channel === selectedChannel);
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
		get selectedLevel() {
			return selectedLevel;
		},
		get selectedChannel() {
			return selectedChannel;
		},
		get selectedDay() {
			return selectedDay;
		},
		get selectedRange() {
			return selectedRange;
		},
		get allDevLogEntries() {
			return allDevLogEntries;
		},
		get allMessageEntries() {
			return allMessageEntries;
		},
		get liveDevLogEntries() {
			return liveDevLogEntries;
		},

		get logDays() {
			return logDays;
		},
		get messageDays() {
			return messageDays;
		},
		get loadingDays() {
			return loadingDays;
		},
		get errorDays() {
			return errorDays;
		},

		// Setters for state updates
		setSelectedLevel(level: LogLevel | null) {
			selectedLevel = level;
		},
		setSelectedChannel(channel: string | null) {
			selectedChannel = channel;
		},
		setSelectedDay(day: string | null) {
			selectedDay = day;
		},
		setSelectedRange(range: [Date, Date] | null) {
			selectedRange = range;
		},
		updateMessageLogEntries(newEntries: LogEntry[]) {
			console.log('🔄 logStore.updateMessageLogEntries called with:', newEntries.length, 'entries');
			messageLogEntries = newEntries;
			console.log('✅ logStore.messageLogEntries updated, new length:', messageLogEntries.length);
		},
		updateLiveDevLogEntries(newEntries: LogEntry[]) {
			console.log('📡 logStore.updateLiveDevLogEntries called with:', newEntries.length, 'entries');
			liveDevLogEntries = newEntries;
			console.log('✅ logStore.liveDevLogEntries updated, new length:', liveDevLogEntries.length);
		},
		updateLogDays(newDays: DayData[]) {
			console.log('📅 logStore.updateLogDays called with:', newDays.length, 'days');
			logDays = newDays;
			console.log('✅ logStore.logDays updated, new length:', logDays.length);
		},
		updateMessageDays(newDays: DayData[]) {
			console.log('📅 logStore.updateMessageDays called with:', newDays.length, 'days');
			messageDays = newDays;
			console.log('✅ logStore.messageDays updated, new length:', messageDays.length);
		},
		updateLogsFromDays(newLogs: LogEntry[]) {
			console.log('📊 logStore.updateLogsFromDays called with:', newLogs.length, 'logs');
			allLogsFromDays = newLogs;
			console.log('✅ logStore.allLogsFromDays updated, new length:', allLogsFromDays.length);
		},
		setLoadingDays(loading: boolean) {
			loadingDays = loading;
		},
		setErrorDays(error: string | null) {
			errorDays = error;
		}
	};
}

// Create and export singleton instance
export const logStore = createLogStore();
