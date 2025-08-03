import { writable, derived } from 'svelte/store';
import * as d3 from 'd3';
import { exampleLogs } from './exampleLogs.js';

export const entries = writable(exampleLogs);

// Month selector store - preselect current month
const currentDate = new Date();
const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
export const selectedMonth = writable(currentMonth);

export const selectedRange = writable(null);
export const visibleCount = writable(100);
export const groupUnit = writable('hour'); // default can be 'hour', 'day', etc.

export const rounders = {
	hour: d3.timeHour,
	day: d3.timeDay,
	week: d3.timeWeek,
	month: d3.timeMonth
};

// Get available months from the data
export const availableMonths = derived(entries, ($entries) => {
	const months = new Set();
	months.add('all'); // Always include 'all' option

	$entries.forEach((entry) => {
		const date = new Date(entry.timestamp);
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		months.add(monthKey);
	});

	return Array.from(months).sort();
});

// Filter entries by selected month
export const monthFilteredEntries = derived(
	[entries, selectedMonth],
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

export const filteredEntries = derived(
	[monthFilteredEntries, selectedRange, groupUnit],
	([$monthFilteredEntries, $range, $unit]) => {
		const start = $range?.[0]?.getTime?.() ?? -Infinity;
		const end = $range?.[1]?.getTime?.() ?? Infinity;
		console.log('start', $range?.[0], 'end', $range?.[1], 'unit', $unit);

		const bucketFn = rounders[$unit] ?? d3.timeHour;

		const filtered = $monthFilteredEntries.filter((e) => {
			const ts = bucketFn(new Date(e.timestamp).getTime());
			// console.log('start', $range?.[0], 'end', $range?.[1], 'timestamp', ts, 'bool', ts >= start && ts <= end);
			return ts >= start && ts <= end;
		});
		console.log('filtered', filtered);
		return filtered;
	}
);

export const grouped = derived(
	[monthFilteredEntries, groupUnit],
	([$monthFilteredEntries, $unit]) => {
		const bucketFn = rounders[$unit] ?? d3.timeHour;
		const floor = bucketFn.floor;

		const map = new Map();

		for (const log of $monthFilteredEntries) {
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
	}
);

export const filteredEntriesWithoutRange = derived(
	monthFilteredEntries,
	($monthFilteredEntries) => $monthFilteredEntries
);
