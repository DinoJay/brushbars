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
}

export type GroupUnit = 'hour' | 'day' | 'month';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export function createLogStore(initialEntries: LogEntry[] = []) {
	// (removed unused safe date helpers)

	// Channel normalization utilities (case-insensitive; strip trailing counts like "MAIN (6)")
	function normalizeChannelName(name: string | null | undefined): string {
		if (!name) return '';
		const cleaned = String(name)
			.trim()
			.replace(/\s*\([^)]*\)\s*$/, '');
		return cleaned.toUpperCase();
	}

	function getEntryChannel(entry: any): string | null {
		return (entry?.channel ?? entry?.channelName ?? null) as string | null;
	}

	function channelMatches(entry: any, selected: string | null): boolean {
		if (!selected) return true;
		const entryNorm = normalizeChannelName(getEntryChannel(entry));
		const selectedNorm = normalizeChannelName(selected);
		return entryNorm !== '' && entryNorm === selectedNorm;
	}

	// Reactive state using Svelte 5 runes
	let liveDevLogEntries = $state<LogEntry[]>([]); // Live dev logs streamed via WebSocket
	let liveMessages = $state<LogEntry[]>([]); // Live channel messages streamed via WebSocket
	// Channel and level selection
	let selectedChannel = $state<string | null>(null);
	let selectedLevel = $state<LogLevel | null>(null);
	let selectedRange = $state<[Date, Date] | null>(null);

	// Days state for both logs and messages
	let devLogDays = $state<DayData[]>([]);
	let messageDays = $state<DayData[]>([]);
	let loadingDays = $state(false);
	let errorDays = $state<string | null>(null);

	// Latest available days tracking
	let latestDevLogDay = $derived.by(() => {
		return devLogDays.length > 0 ? devLogDays[devLogDays.length - 1]?.date : null;
	});

	let latestMessageDay = $derived.by(() => {
		return messageDays.length > 0 ? messageDays[messageDays.length - 1]?.date : null;
	});

	// Decoupled messages for selected day (channels)
	let messages = $state<LogEntry[]>([]);

	// Decoupled dev logs for selected day (dev logs)
	let devLogs = $state<LogEntry[]>([]);

	// Note: messages are populated by updateMessages()

	// All dev logs without any filters: merge stored + live, de-duplicate by id
	let allDevLogs = $derived.by(() => {
		const list = [...(devLogs || []), ...(liveDevLogEntries || [])];
		return dedupeById(list);
	});

	// All messages without any filters: merge stored + live, de-duplicate by id
	let allMessages = $derived.by(() => {
		const list = [...(messages || []), ...(liveMessages || [])];
		return dedupeById(list);
	});

	const helperEnhancedDays = (entries: DayData[], liveEntries: LogEntry[]) => {
		const today = new Date().toISOString().split('T')[0];
		let todayInside = false;

		const newDays = [];
		entries.forEach((day) => {
			if (day.date === today) {
				todayInside = true;
				// For today, compute delta stats from live entries and add to base stats (slim days)
				const liveTodayEntries = liveEntries.filter((log) => {
					try {
						const logDate = new Date(log.timestamp).toISOString().split('T')[0];

						return logDate === today;
					} catch (error) {
						console.error('   Error parsing log timestamp:', log.timestamp, error);
						return false;
					}
				});

				const baseStats = day.stats ?? {
					total: 0,
					INFO: 0,
					ERROR: 0,
					WARN: 0,
					DEBUG: 0,
					WARNING: 0,
					FATAL: 0,
					TRACE: 0
				};
				const deltaStats = calculateStats(liveTodayEntries);
				const stats = addStats(baseStats, deltaStats);

				console.log('   Dev today base stats:', baseStats);
				console.log('   Dev today delta (live) stats:', deltaStats);
				console.log('   Dev today combined stats:', stats);

				newDays.push({
					...day,
					stats,
					formattedDate: formatDateForDisplay(day.date)
				});
			} else {
				newDays.push({
					...day,
					formattedDate: formatDateForDisplay(day.date)
				});
			}
		});

		if (!todayInside) {
			const liveTodayEntries = liveEntries.filter((log) => {
				try {
					const logDate = new Date(log.timestamp).toISOString().split('T')[0];
					return logDate === today;
				} catch (error) {
					console.error('   Error parsing log timestamp:', log.timestamp, error);
					return false;
				}
			});

			const liveStats = calculateStats(liveTodayEntries);
			newDays.push({
				date: today,
				formattedDate: formatDateForDisplay(today),
				stats: liveStats
			});
		}

		return newDays;
	};
	// Enhanced day data that includes live entries
	let enhancedDevLogDays = $derived.by(() => {
		if (!devLogDays || devLogDays.length === 0) return devLogDays;
		return helperEnhancedDays(devLogDays, liveDevLogEntries);
	});

	let enhancedMessageDays = $derived.by(() => {
		if (!messageDays || messageDays.length === 0) return messageDays;
		return helperEnhancedDays(messageDays, liveMessages);
	});

	// Helper function to format date as "25 JUN 2025"
	function formatDateForDisplay(dateString: string): string {
		try {
			const date = new Date(dateString);
			if (isNaN(date.getTime())) return dateString;

			const day = date.getDate().toString().padStart(2, '0');
			const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
			const year = date.getFullYear();

			return `${day} ${month} ${year}`;
		} catch {
			return dateString;
		}
	}

	// Helper function to calculate stats from entries
	function calculateStats(entries: LogEntry[]) {
		console.log('🔍 calculateStats called with', entries.length, 'entries');

		const stats = {
			total: entries.length,
			INFO: 0,
			ERROR: 0,
			WARN: 0,
			DEBUG: 0,
			WARNING: 0,
			FATAL: 0,
			TRACE: 0
		};

		entries.forEach((entry, idx) => {
			// For messages, check both level and status fields
			let level = entry.level?.toUpperCase();
			if (!level && (entry as any).status) {
				level = (entry as any).status.toUpperCase();
			}

			console.log(`   Entry ${idx}:`, {
				id: entry.id,
				level: entry.level,
				status: (entry as any).status,
				finalLevel: level,
				hasLevel: level && level in stats
			});

			if (level && level in stats) {
				(stats as any)[level]++;
			}
		});

		console.log('   Final stats:', stats);
		return stats;
	}

	// Helper to add two stats objects together (sum per-level and total)
	function addStats(a: any, b: any) {
		const keys = ['total', 'INFO', 'ERROR', 'WARN', 'DEBUG', 'WARNING', 'FATAL', 'TRACE'];
		const out: any = {};
		for (const k of keys) {
			out[k] = (a?.[k] || 0) + (b?.[k] || 0);
		}
		return out;
	}

	// Timeline helpers (merged + filtered by current selected filters)
	function applyLevelAndChannelFilters(list: LogEntry[]): LogEntry[] {
		let filtered = list;
		if (selectedLevel) {
			filtered = filtered.filter((e: any) => e?.level === selectedLevel);
		}
		if (selectedChannel) {
			filtered = filtered.filter((e: any) => channelMatches(e as any, selectedChannel));
		}
		return filtered;
	}

	// Helper: apply level, channel, and optional time-range filters in one place
	function applyAllFilters(list: LogEntry[]): LogEntry[] {
		let filtered = applyLevelAndChannelFilters(list);

		if (selectedRange && selectedRange.length === 2) {
			const [start, end] = selectedRange;
			if (
				start instanceof Date &&
				end instanceof Date &&
				!isNaN(start.getTime()) &&
				!isNaN(end.getTime())
			) {
				const startMs = start.getTime();
				const endMs = end.getTime();
				filtered = filtered.filter((entry) => {
					const entryMs = new Date(entry.timestamp).getTime();
					return entryMs >= startMs && entryMs <= endMs;
				});
			}
		}

		return filtered;
	}

	// Helper function to deduplicate entries by ID or fallback to timestamp+channel+message
	function dedupeById(list: LogEntry[]): LogEntry[] {
		const seen = new Set<string>();
		return list.filter((entry) => {
			const key =
				(entry.id as string) ||
				`${entry.timestamp}|${(entry as any).channel || ''}|${entry.message}`;
			if (seen.has(key)) {
				return false;
			}
			seen.add(key);
			return true;
		});
	}

	const filterEntriesByDay = (entries: LogEntry[], day: string) =>
		entries.filter((entry) => {
			try {
				const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
				return entryDate === day;
			} catch (error) {
				console.error('Error parsing entry timestamp:', entry.timestamp, error);
				return false;
			}
		});

	// Helper function to share logic for filtering entries by day and applying level/channel filters
	function getTimelineEntriesForDay(
		day: string,
		storedEntries: LogEntry[],
		liveEntries: LogEntry[]
	): LogEntry[] {
		// Merge stored and live entries, filter by day, then apply level/channel filters
		const allEntries = [...(storedEntries || []), ...(liveEntries || [])];
		const dayFiltered = filterEntriesByDay(allEntries, day);
		return applyLevelAndChannelFilters(dayFiltered);
	}

	// Helper function to share logic for getting filter entries by day (without level/channel filters)
	function getFilterEntriesForDay(
		day: string,
		storedEntries: LogEntry[],
		liveEntries: LogEntry[]
	): LogEntry[] {
		// Merge stored and live entries, filter by day only (no level/channel filters)
		const allEntries = [...(storedEntries || []), ...(liveEntries || [])];
		return filterEntriesByDay(allEntries, day);
	}

	function getTimelineDevEntries(day: string): LogEntry[] {
		return getTimelineEntriesForDay(day, allDevLogs || [], liveDevLogEntries || []);
	}

	function getDevLogFilterEntries(day: string | null): LogEntry[] | undefined {
		if (day) {
			return getFilterEntriesForDay(day, allDevLogs || [], liveDevLogEntries || []);
		} else {
			return undefined;
		}
	}

	function getMessageFilterEntriesForDay(day: string): LogEntry[] {
		return getFilterEntriesForDay(day, messages || [], liveMessages || []);
	}

	// Return public API
	return {
		// Getters for reactive values
		get selectedLevel() {
			return selectedLevel;
		},
		get selectedChannel() {
			return selectedChannel;
		},
		get selectedRange() {
			return selectedRange;
		},
		// (removed unused getters: timelineDevLogs, allDevLogs, allMessages)
		get devLogs() {
			return devLogs;
		},
		get messages() {
			return messages;
		},
		// (removed unused getter: timelineMessageEntries)

		// Unified entry point to update messages across the app
		applyMessagesUpdate(payload: { day?: string; messages: LogEntry[]; source: 'api' | 'ws' }) {
			try {
				if (!payload || !Array.isArray(payload.messages) || payload.messages.length === 0) return;
				const { day, messages: incoming, source } = payload;

				if (source === 'api') {
					// Replace messages state with API payload and ensure day bucket populated
					this.updateMessages(incoming);
					if (day) {
						// For API updates, we just update the messages state
						// The day buckets are managed separately via updateMessageDays
					}
				} else {
					// WebSocket: merge into live state
					const mergedLive = [...(liveMessages || []), ...incoming];
					this.updateLiveMessages(mergedLive);
				}
			} catch (e) {
				console.warn('applyMessagesUpdate failed:', e);
			}
		},

		get liveDevLogEntries() {
			return liveDevLogEntries;
		},
		get liveMessages() {
			return liveMessages;
		},

		get devLogDays() {
			return enhancedDevLogDays;
		},
		get messageDays() {
			return enhancedMessageDays;
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

		setSelectedRange(range: [Date, Date] | null) {
			selectedRange = range;
		},
		updateLiveDevLogEntries(newEntries: LogEntry[]) {
			liveDevLogEntries = newEntries;
		},
		updateLiveMessages(newMessages: LogEntry[]) {
			liveMessages = newMessages;
		},
		updateDevLogs(newLogs: LogEntry[]) {
			devLogs = Array.isArray(newLogs) ? newLogs : [];
		},
		updateDevLogDays(newDays: DayData[]) {
			devLogDays = newDays;
		},
		updateMessageDays(newDays: DayData[]) {
			messageDays = newDays;
		},
		updateMessages(newEntries: LogEntry[]) {
			messages = Array.isArray(newEntries) ? newEntries : [];
		},
		setLoadingDays(loading: boolean) {
			loadingDays = loading;
		},
		setErrorDays(error: string | null) {
			errorDays = error;
		},

		// For LogFilters consumers
		getDevLogFilterEntries,
		getMessageFilterEntriesForDay,

		// For Timeline consumers
		getTimelineDevEntries,

		// Get enhanced day data with live entries integrated
		getEnhancedDevLogDays() {
			return enhancedDevLogDays;
		},

		getEnhancedMessageDays() {
			return enhancedMessageDays;
		},
		getTimelineMessageEntries(selectedDay: string) {
			return applyLevelAndChannelFilters(filterEntriesByDay(allMessages, selectedDay));
		},

		// Function to get filtered messages for a specific day with optional time range
		getFilteredFullMessagesEntries(selectedDay: string) {
			return applyAllFilters(filterEntriesByDay(allMessages, selectedDay));
		},
		getFilteredFullDevLogEntries(selectedDay: string) {
			// BUGFIX: use allDevLogs (not allMessages) for dev logs table filtering
			return applyAllFilters(filterEntriesByDay(allDevLogs, selectedDay));
		},

		// Latest available days getters
		get latestDevLogDay() {
			return latestDevLogDay;
		},

		get latestMessageDay() {
			return latestMessageDay;
		},

		// Helper functions for day validation and navigation
		getLatestDay(route: 'logs' | 'channels'): string | null {
			return route === 'logs' ? latestDevLogDay : latestMessageDay;
		},

		getAvailableDays(route: 'logs' | 'channels'): DayData[] {
			return route === 'logs' ? devLogDays : messageDays;
		},

		isDayValid(route: 'logs' | 'channels', day: string | null): boolean {
			if (!day) return false;
			const availableDays = this.getAvailableDays(route);
			return availableDays.some((d) => d.date === day);
		},

		getValidDay(route: 'logs' | 'channels', currentDay: string | null): string | null {
			if (!currentDay) {
				// If no day selected, return the latest available day
				return this.getLatestDay(route);
			}

			// If current day is valid, return it
			if (this.isDayValid(route, currentDay)) {
				return currentDay;
			}

			// If current day is invalid, return the latest available day
			return this.getLatestDay(route);
		}
	};
}

// Create and export singleton instance
export const logStore = createLogStore();
