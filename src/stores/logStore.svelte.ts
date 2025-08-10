import * as d3 from 'd3';
import type { TimelineEntry } from '$lib/types';

export type LogEntry = TimelineEntry;

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
	let selectedDay = $state<string | null>(null); // Initialize with today

	// Days state for both logs and messages
	let devLogDays = $state<DayData[]>([]);
	let messageDays = $state<DayData[]>([]);
	let loadingDays = $state(false);
	let errorDays = $state<string | null>(null);

	// Decoupled messages for selected day (channels)
	let messages = $state<LogEntry[]>([]);

	// Decoupled dev logs for selected day (dev logs)
	let devLogs = $state<LogEntry[]>([]);

	// Note: messages are populated by updateMessages()

	// All dev logs without any filters (selected day + live WS)
	let allDevLogs = $derived.by(() => {
		return [...(devLogs || []), ...(liveDevLogEntries || [])];
	});

	// All messages without any filters (no live WS for messages yet)
	let allMessages = $derived.by(() => {
		return [...(messages || [])];
	});

	// All dev log entries (without brush filter - for timeline)
	let timelineDevLogs = $derived.by(() => {
		let filtered = allDevLogs;

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

	// Binary search helpers
	function lowerBoundByTimestamp(entries: LogEntry[], targetMs: number): number {
		let lo = 0;
		let hi = entries.length;
		while (lo < hi) {
			const mid = (lo + hi) >>> 1;
			const midMs = (entries[mid] as any).timestampMs as number;
			if (midMs < targetMs) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}
	function upperBoundByTimestamp(entries: LogEntry[], targetMs: number): number {
		let lo = 0;
		let hi = entries.length;
		while (lo < hi) {
			const mid = (lo + hi) >>> 1;
			const midMs = (entries[mid] as any).timestampMs as number;
			if (midMs <= targetMs) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}

	// Ensure numeric timestamp on entries
	function withTimestampMs(list: LogEntry[]): LogEntry[] {
		for (let i = 0; i < list.length; i++) {
			const e: any = list[i];
			if (typeof e.timestampMs !== 'number') {
				e.timestampMs = new Date((e as any).timestamp).getTime();
			}
		}
		return list;
	}

	// Sorted copies for fast range slicing (stable when inputs unchanged)
	let sortedTimelineDevLogs = $derived.by(() => {
		const arr = withTimestampMs([...timelineDevLogs]);
		arr.sort((a: any, b: any) => a.timestampMs - b.timestampMs);
		return arr;
	});

	// All dev log entries (with all filters including brush - for table)
	let filteredDevLogs = $derived.by(() => {
		// Early return if no brush filter
		if (!selectedRange || selectedRange.length !== 2) {
			return timelineDevLogs;
		}

		const [start, end] = selectedRange;
		if (
			!(start instanceof Date) ||
			isNaN(start.getTime()) ||
			!(end instanceof Date) ||
			isNaN(end.getTime())
		) {
			return [] as LogEntry[];
		}
		const startMs = start.getTime();
		const endMs = end.getTime();

		const arr = sortedTimelineDevLogs;
		if (arr.length === 0) {
			return arr;
		}

		const i0 = lowerBoundByTimestamp(arr, startMs);
		const i1 = upperBoundByTimestamp(arr, endMs);

		if (i0 >= i1) {
			return [] as LogEntry[];
		}

		const result = arr.slice(i0, i1);
		return result;
	});

	// All message entries (without brush filter - for timeline)
	let timelineMessageEntries = $derived.by(() => {
		// Use only messages to avoid mixing dev WS logs
		let filtered = messages || [];

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

	// Removed allMessageEntries; use messages or timelineMessageEntries directly

	// Sorted messages for fast range slicing
	let sortedTimelineMessages = $derived.by(() => {
		const arr = withTimestampMs([...timelineMessageEntries]);
		arr.sort((a: any, b: any) => a.timestampMs - b.timestampMs);
		return arr;
	});

	// Messages for table (apply brush filter via binary search)
	let filteredMessages = $derived.by(() => {
		if (!selectedRange || selectedRange.length !== 2) {
			return timelineMessageEntries;
		}

		const [start, end] = selectedRange;
		if (
			!(start instanceof Date) ||
			isNaN(start.getTime()) ||
			!(end instanceof Date) ||
			isNaN(end.getTime())
		) {
			return [] as LogEntry[];
		}
		const startMs = start.getTime();
		const endMs = end.getTime();

		const arr = sortedTimelineMessages;
		if (arr.length === 0) return arr;
		const i0 = lowerBoundByTimestamp(arr, startMs);
		const i1 = upperBoundByTimestamp(arr, endMs);
		if (i0 >= i1) return [] as LogEntry[];
		return arr.slice(i0, i1);
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
		get allDevLogs() {
			return allDevLogs;
		},
		get allMessages() {
			return allMessages;
		},
		get devLogs() {
			return devLogs;
		},
		get messages() {
			return messages;
		},
		get filteredMessages() {
			return filteredMessages;
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
		updateDevLogs(newLogs: LogEntry[]) {
			console.log('📊 logStore.updateDevLogs called with:', newLogs?.length || 0, 'logs');
			devLogs = Array.isArray(newLogs) ? newLogs : [];
			console.log('✅ logStore.devLogs updated, new length:', devLogs.length);
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
		updateMessages(newEntries: LogEntry[]) {
			console.log('🔄 logStore.updateMessages called with:', newEntries?.length || 0, 'entries');
			messages = Array.isArray(newEntries) ? newEntries : [];
			console.log('✅ logStore.messages updated, new length:', messages.length);
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
