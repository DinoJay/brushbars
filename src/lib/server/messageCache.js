// Simple in-memory cache for per-day messages on the server
// Note: Lives in server memory; resets on server restart/HMR

/** @type {Map<string, { messages: any[]; updatedAt: number }>} */
const dayMessageCache = new Map();

/**
 * Store messages for a specific ISO date (YYYY-MM-DD)
 * @param {string} date
 * @param {any[]} messages
 */
export function setDayMessages(date, messages) {
	if (!date) return;
	dayMessageCache.set(date, {
		messages: Array.isArray(messages) ? messages : [],
		updatedAt: Date.now()
	});
}

/**
 * Get cached messages for a specific date
 * @param {string} date
 * @returns {any[] | null}
 */
export function getDayMessages(date) {
	const entry = dayMessageCache.get(date);
	if (!entry) return null;
	return entry.messages;
}

/**
 * Warm the cache for multiple days at once
 * @param {{ date: string; messages: any[] }[]} items
 */
export function warmCache(items) {
	if (!Array.isArray(items)) return;
	for (const item of items) {
		if (!item || !item.date) continue;
		setDayMessages(item.date, item.messages || []);
	}
}

/**
 * Clear the entire cache
 */
export function clearMessageCache() {
	dayMessageCache.clear();
}

/**
 * Simple stats for debugging
 */
export function getCacheStats() {
	return { size: dayMessageCache.size };
}
