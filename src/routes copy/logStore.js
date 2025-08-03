import { writable, derived } from 'svelte/store';
import { exampleLogs } from './exampleLogs.js';

export const entries = writable(exampleLogs);

export const selectedRange = writable(null);
export const visibleCount = writable(100);
export const groupUnit = writable('hour'); // default can be 'hour', 'day', etc.

export const rounders = {
	hour: d3.timeHour,
	day: d3.timeDay,
	week: d3.timeWeek,
	month: d3.timeMonth
};

import * as d3 from 'd3';
export const filteredEntries = derived([entries, selectedRange], ([$entries, $range]) => {
	const start = $range?.[0]?.getTime?.() ?? -Infinity;
	const end = $range?.[1]?.getTime?.() ?? Infinity;
	const filtered = $entries.filter((e) => {
		const ts = rounders.hour(new Date(e.timestamp).getTime());
		// console.log('start', $range?.[0], 'end', $range?.[1], 'timestamp', ts, 'bool', ts >= start && ts <= end);
		return ts >= start && ts <= end;
	});
	console.log('filtered', filtered);
	return filtered;
});

export const grouped = derived([entries, groupUnit], ([$entries, $unit]) => {
	const bucketFn = rounders[$unit] ?? d3.timeHour;
	const floor = bucketFn.floor;

	const map = new Map();

	for (const log of $entries) {
		const bucketTime = floor(new Date(log.timestamp));
		const key = bucketTime.getTime();

		if (!map.has(key)) {
			map.set(key, {
				time: bucketTime,
				count: 0,
				levels: {},
				logs: [] // ✅ store corresponding logs here
			});
		}

		const group = map.get(key);
		const level = log.level || 'UNKNOWN';

		group.count++;
		group.levels[level] = (group.levels[level] || 0) + 1;
		group.logs.push(log); // ✅ add raw log
	}

	return Array.from(map.values()).sort((a, b) => a.time - b.time);
});

export const filteredEntriesWithoutRange = derived(entries, ($entries) => $entries);
