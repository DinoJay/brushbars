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

	// Decoupled messages for selected day (channels)
	let messages = $state<LogEntry[]>([]);

	// Decoupled dev logs for selected day (dev logs)
	let devLogs = $state<LogEntry[]>([]);

	// Note: messages are populated by updateMessages()

	// All dev logs without any filters (selected day + live WS)
	let allDevLogs = $derived.by(() => {
		return [...(devLogs || []), ...(liveDevLogEntries || [])];
	});

	// All messages without any filters: merge stored + live, de-duplicate by id
	let allMessages = $derived.by(() => {
		const list = [...(messages || []), ...(liveMessages || [])];
		const seen = new Set<string | number>();
		const deduped: LogEntry[] = [];
		for (const m of list) {
			const id =
				(m as any)?.id ?? `${(m as any)?.timestamp}|${(m as any)?.channel}|${(m as any)?.message}`;
			if (!seen.has(id)) {
				seen.add(id);
				deduped.push(m);
			}
		}
		return deduped;
	});

	// Enhanced day data that includes live entries
	let enhancedDevLogDays = $derived.by(() => {
		if (!devLogDays || devLogDays.length === 0) return devLogDays;

		const today = new Date().toISOString().split('T')[0];

		return devLogDays.map((day) => {
			if (day.date === today) {
				// For today, compute delta stats from live entries and add to base stats (slim days)
				const liveTodayLogs = liveDevLogEntries.filter((log) => {
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
				const deltaStats = calculateStats(liveTodayLogs);
				const stats = addStats(baseStats, deltaStats);

				console.log('   Dev today base stats:', baseStats);
				console.log('   Dev today delta (live) stats:', deltaStats);
				console.log('   Dev today combined stats:', stats);

				return {
					...day,
					stats,
					formattedDate: formatDateForDisplay(day.date)
				};
			}
			return {
				...day,
				formattedDate: formatDateForDisplay(day.date)
			};
		});
	});

	let enhancedMessageDays = $derived.by(() => {
		if (!messageDays || messageDays.length === 0) return messageDays;

		const today = new Date().toISOString().split('T')[0];

		console.log('🔍 liveMessages:', liveMessages);
		return messageDays.map((day) => {
			if (day.date === today) {
				console.log('🔍 today:', day);
				// For today, compute delta stats from live entries and add to base stats
				const liveTodayMessages = liveMessages.filter((message) => {
					try {
						const messageDate = new Date(message.timestamp).toISOString().split('T')[0];
						console.log(
							'   Comparing message date:',
							messageDate,
							'with today:',
							today,
							'match:',
							messageDate === today
						);
						return messageDate === today;
					} catch (error) {
						console.error('   Error parsing message timestamp:', message.timestamp, error);
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
				const deltaStats = calculateStats(liveTodayMessages);
				const stats = addStats(baseStats, deltaStats);

				console.log('   Today base stats:', baseStats);
				console.log('   Today delta (live) stats:', deltaStats);
				console.log('   Today combined stats:', stats);

				return {
					...day,
					stats,
					formattedDate: formatDateForDisplay(day.date)
				};
			}
			return {
				...day,
				formattedDate: formatDateForDisplay(day.date)
			};
		});
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

	// Helpers for LogFilters: merged day-specific entries (deduplicated)
	function dedupeById(list: LogEntry[]): LogEntry[] {
		const seen = new Set<string | number>();
		const out: LogEntry[] = [];
		for (const e of list) {
			const id =
				(e as any)?.id ?? `${(e as any)?.timestamp}|${(e as any)?.channel}|${(e as any)?.message}`;
			if (!seen.has(id)) {
				seen.add(id);
				out.push(e);
			}
		}
		return out;
	}

	function getDevFilterEntriesForDay(day: string): LogEntry[] {
		// Slim mode: current selected day's dev logs live in `devLogs`
		return devLogs || [];
	}

	function getMessageFilterEntriesForDay(day: string): LogEntry[] {
		// Simplified: current day's messages are held in `messages`
		return messages || [];
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
	function applyAllFilters(list: LogEntry[], includeTimeRange: boolean): LogEntry[] {
		let filtered = applyLevelAndChannelFilters(list);

		if (includeTimeRange && selectedRange && selectedRange.length === 2) {
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

	function getTimelineDevEntriesForDay(day: string): LogEntry[] {
		// Slim mode: use current `devLogs`
		return applyLevelAndChannelFilters(devLogs || []);
	}

	function getTimelineMessageEntriesForDay(day: string): LogEntry[] {
		// Simplified: use current `messages` state
		return applyLevelAndChannelFilters(messages || []);
	}

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
		get filteredDevLogs() {
			// Base on allDevLogs so live WS entries are included
			let filtered = allDevLogs;

			// Apply level filter
			if (selectedLevel) {
				filtered = filtered.filter((log) => log.level === selectedLevel);
			}

			// Apply channel filter
			if (selectedChannel) {
				filtered = filtered.filter((log) => channelMatches(log as any, selectedChannel));
			}

			return filtered;
		},
		// (removed unused getters: timelineDevLogs, allDevLogs, allMessages)
		get devLogs() {
			return devLogs;
		},
		get messages() {
			return messages;
		},
		get filteredMessages() {
			// Apply level and channel filters to messages
			let filtered = allMessages;

			// Apply level filter
			if (selectedLevel) {
				filtered = filtered.filter((message) => message.level === selectedLevel);
			}

			// Apply channel filter
			if (selectedChannel) {
				filtered = filtered.filter((message) => channelMatches(message as any, selectedChannel));
			}

			return filtered;
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
						this.updateDayWithMessages(day, incoming);
					}
				} else {
					// WebSocket: merge into live state and fold into day buckets
					const mergedLive = dedupeById([...(liveMessages || []), ...incoming]);
					this.updateLiveMessages(mergedLive);
					this.updateMessageDaysFromMessages(incoming);
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
			console.log('📡 logStore.updateLiveDevLogEntries called with:', newEntries.length, 'entries');
			liveDevLogEntries = newEntries;
			console.log('✅ logStore.liveDevLogEntries updated, new length:', liveDevLogEntries.length);
		},
		updateLiveMessages(newMessages: LogEntry[]) {
			console.log('📡 logStore.updateLiveMessages called with:', newMessages.length, 'messages');
			console.log('📡 Sample message:', newMessages[0]);
			console.log('📡 Message timestamp:', newMessages[0]?.timestamp);
			console.log('📡 Message timestamp type:', typeof newMessages[0]?.timestamp);
			liveMessages = newMessages;
			console.log('✅ logStore.liveMessages updated, new length:', liveMessages.length);

			// Fold incoming live messages into day buckets so non-today days also reflect WS data
			// This keeps messageDays up-to-date even when enhancedMessageDays only merges today
			if (Array.isArray(newMessages) && newMessages.length > 0) {
				this.updateMessageDaysFromMessages(newMessages);
			}
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
		},

		// For LogFilters consumers
		getDevFilterEntriesForDay,
		getMessageFilterEntriesForDay,

		// For Timeline consumers
		getTimelineDevEntriesForDay,
		getTimelineMessageEntriesForDay,

		// Function to get filtered logs for a specific day with optional time range
		getFilteredLogsForDay(selectedDay: string | null, includeTimeRange = true) {
			return applyAllFilters(devLogs || [], includeTimeRange);
		},

		// Function to get filtered messages for a specific day with optional time range
		getFilteredMessagesForDay(selectedDay: string | null, includeTimeRange = true) {
			const filtered = applyAllFilters(messages || [], includeTimeRange);
			console.log('   Final filtered count:', filtered.length);
			return filtered;
		},

		// Get enhanced day data with live entries integrated
		getEnhancedDevLogDays() {
			return enhancedDevLogDays;
		},

		getEnhancedMessageDays() {
			return enhancedMessageDays;
		},

		// Get today's data with live entries integrated
		getTodayDevLogs() {
			const today = new Date().toISOString().split('T')[0];
			const todayDay = enhancedDevLogDays.find((d) => d.date === today);
			return todayDay?.logs || [];
		},

		getTodayMessages() {
			const today = new Date().toISOString().split('T')[0];
			const todayDay = enhancedMessageDays.find((d) => d.date === today);
			return todayDay?.messages || [];
		},

		// Helper function to create day-based structure from messages
		updateMessageDaysFromMessages(newMessages: LogEntry[]) {
			console.log('🔄 updateMessageDaysFromMessages called with:', newMessages.length, 'messages');

			// Group incoming messages by date
			const incomingByDay = new Map<string, LogEntry[]>();
			for (const message of newMessages) {
				try {
					const date = new Date(message.timestamp).toISOString().split('T')[0];
					if (!incomingByDay.has(date)) incomingByDay.set(date, []);
					incomingByDay.get(date)!.push(message);
				} catch (error) {
					console.error('Error parsing message timestamp:', (message as any)?.timestamp, error);
				}
			}

			// Build a map of existing days for quick lookup
			const existingByDate = new Map<string, DayData>(messageDays.map((d) => [d.date, d]));

			// Merge incoming day groups into existing days
			for (const [date, messagesForDate] of incomingByDay.entries()) {
				const existing = existingByDate.get(date);
				if (existing) {
					const existingMessages = existing.messages || [];
					const merged = [...existingMessages];
					const seen = new Set(
						existingMessages.map((m: any) => m.id ?? `${m.timestamp}|${m.channel}|${m.message}`)
					);
					for (const m of messagesForDate) {
						const id =
							(m as any)?.id ??
							`${(m as any)?.timestamp}|${(m as any)?.channel}|${(m as any)?.message}`;
						if (!seen.has(id)) {
							merged.push(m);
							seen.add(id);
						}
					}
					existingByDate.set(date, {
						...existing,
						messages: merged,
						stats: calculateStats(merged),
						formattedDate: formatDateForDisplay(date)
					});
				} else {
					existingByDate.set(date, {
						date,
						formattedDate: formatDateForDisplay(date),
						stats: calculateStats(messagesForDate),
						messages: messagesForDate
					});
				}
			}

			// Reconstruct the array preserving any days that were not in the incoming batch
			const mergedDays = Array.from(existingByDate.values()).sort((a, b) =>
				a.date.localeCompare(b.date)
			);
			messageDays = mergedDays;
		},

		// Update a specific day with its messages (for when we fetch individual day data)
		updateDayWithMessages(dayDate: string, messages: LogEntry[]) {
			console.log(
				'🔄 updateDayWithMessages called for day:',
				dayDate,
				'with',
				messages.length,
				'messages'
			);

			// Find the existing day
			const existingDayIndex = messageDays.findIndex((d) => d.date === dayDate);

			if (existingDayIndex >= 0) {
				// Update existing day with messages and recalculate stats
				const updatedDay = {
					...messageDays[existingDayIndex],
					messages,
					stats: calculateStats(messages)
				};

				// Create new array to trigger reactivity
				messageDays = [
					...messageDays.slice(0, existingDayIndex),
					updatedDay,
					...messageDays.slice(existingDayIndex + 1)
				];

				console.log('✅ Updated existing day:', dayDate, 'with', messages.length, 'messages');
			} else {
				// Create new day entry
				const newDay: DayData = {
					date: dayDate,
					formattedDate: formatDateForDisplay(dayDate),
					stats: calculateStats(messages),
					messages
				};

				messageDays = [...messageDays, newDay];
				console.log('✅ Created new day:', dayDate, 'with', messages.length, 'messages');
			}
		}
	};
}

// Create and export singleton instance
export const logStore = createLogStore();
