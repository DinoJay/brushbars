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
	messages?: any[]; // Individual messages for this day
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
	let liveDevLogEntries = $state<LogEntry[]>([]); // Live dev logs streamed via WebSocket
	let selectedRange = $state<[Date, Date] | null>(null);
	let selectedLevel = $state<LogLevel | null>(null);
	let selectedChannel = $state<string | null>(null);
	let selectedDay = $state<string | null>(new Date().toISOString().split('T')[0]); // Initialize with today

	// Days state for both logs and messages
	let devLogDays = $state<DayData[]>([]);
	let messageDays = $state<DayData[]>([]);
	let loadingDays = $state(false);
	let errorDays = $state<string | null>(null);

	// Decoupled current messages for selected day (channels)
	let currentMessageLogs = $state<LogEntry[]>([]);

	// Decoupled current dev logs for selected day (dev logs)
	let currentDevLogs = $state<LogEntry[]>([]);

	// Note: currentMessageLogs is populated by updateCurrentMessageLogs()

	// All dev log entries (without brush filter - for timeline)
	let timelineDevLogs = $derived.by(() => {
		// Combine logs from selected day with live WebSocket entries
		const allEntries = [...(currentDevLogs || []), ...(liveDevLogEntries || [])];
		let filtered = allEntries;

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

	// All dev log entries (with all filters including brush - for table)
	let filteredDevLogs = $derived.by(() => {
		// Early return if no brush filter
		if (!selectedRange || selectedRange.length !== 2) {
			return timelineDevLogs;
		}

		const [start, end] = selectedRange;
		const startMs = start.getTime();
		const endMs = end.getTime();

		// Use more efficient filtering with pre-computed timestamps
		return timelineDevLogs.filter((log) => {
			const ts = new Date(log.timestamp).getTime();
			return ts >= startMs && ts <= endMs;
		});
	});

	// All message entries (without brush filter - for timeline)
	let timelineMessageEntries = $derived.by(() => {
		// Use only currentMessageLogs to avoid mixing dev WS logs
		let filtered = currentMessageLogs || [];

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

	// All message entries (with all filters including brush - for table)
	let allMessageEntries = $derived.by(() => {
		// Early return if no brush filter
		if (!selectedRange || selectedRange.length !== 2) {
			return timelineMessageEntries;
		}

		const [start, end] = selectedRange;
		const startMs = start.getTime();
		const endMs = end.getTime();

		// Use more efficient filtering with pre-computed timestamps
		return timelineMessageEntries.filter((log) => {
			const ts = new Date(log.timestamp).getTime();
			return ts >= startMs && ts <= endMs;
		});
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
		get filteredDevLogs() {
			return filteredDevLogs;
		},
		get timelineDevLogs() {
			return timelineDevLogs;
		},
		get currentDevLogs() {
			return currentDevLogs;
		},
		get currentMessageLogs() {
			return currentMessageLogs;
		},
		get allMessageEntries() {
			return allMessageEntries;
		},
		get timelineMessageEntries() {
			return timelineMessageEntries;
		},
		get liveDevLogEntries() {
			return liveDevLogEntries;
		},

		get devLogDays() {
			return devLogDays;
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
		updateLiveDevLogEntries(newEntries: LogEntry[]) {
			console.log('📡 logStore.updateLiveDevLogEntries called with:', newEntries.length, 'entries');
			liveDevLogEntries = newEntries;
			console.log('✅ logStore.liveDevLogEntries updated, new length:', liveDevLogEntries.length);
		},
		updateCurrentDevLogs(newLogs: LogEntry[]) {
			console.log('📊 logStore.updateCurrentDevLogs called with:', newLogs?.length || 0, 'logs');
			currentDevLogs = Array.isArray(newLogs) ? newLogs : [];
			console.log('✅ logStore.currentDevLogs updated, new length:', currentDevLogs.length);
		},
		updateDevLogDays(newDays: DayData[]) {
			console.log('📅 logStore.updateDevLogDays called with:', newDays.length, 'days');
			devLogDays = newDays;
			console.log('✅ logStore.devLogDays updated, new length:', devLogDays.length);
		},
		updateMessageDays(newDays: DayData[]) {
			console.log('📅 logStore.updateMessageDays called with:', newDays.length, 'days');
			messageDays = newDays;
			console.log('✅ logStore.messageDays updated, new length:', messageDays.length);
		},
		updateCurrentMessageLogs(newEntries: LogEntry[]) {
			console.log(
				'🔄 logStore.updateCurrentMessageLogs called with:',
				newEntries?.length || 0,
				'entries'
			);
			currentMessageLogs = Array.isArray(newEntries) ? newEntries : [];
			console.log('✅ logStore.currentMessageLogs updated, new length:', currentMessageLogs.length);
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
