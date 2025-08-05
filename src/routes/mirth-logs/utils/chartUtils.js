import * as d3 from 'd3';

export function formatTick(date, groupUnit, xScale) {
	// Get the time span to determine appropriate format
	const domain = xScale?.domain();
	const timeSpan = domain ? domain[1].getTime() - domain[0].getTime() : 0;
	const oneDay = 24 * 60 * 60 * 1000;
	const oneWeek = 7 * oneDay;
	const oneMonth = 30 * oneDay;

	switch (groupUnit) {
		case 'hour':
			// For hourly view, show more detail
			if (timeSpan <= oneDay) {
				return d3.timeFormat('%H:%M')(date); // e.g. 13:30
			} else if (timeSpan <= oneWeek) {
				return d3.timeFormat('%a %Hh')(date); // e.g. Mon 13h
			} else {
				return d3.timeFormat('%b %d %Hh')(date); // e.g. Aug 02 13h
			}
		case 'day':
			// For daily view
			if (timeSpan <= oneWeek) {
				return d3.timeFormat('%a %d')(date); // e.g. Mon 15
			} else if (timeSpan <= oneMonth) {
				return d3.timeFormat('%b %d')(date); // e.g. Aug 15
			} else {
				return d3.timeFormat('%b %Y')(date); // e.g. Aug 2024
			}
		case 'week':
			// For weekly view
			if (timeSpan <= oneMonth) {
				return `W${d3.timeFormat('%U')(date)}\n${d3.timeFormat('%b %d')(date)}`; // e.g. W32\nAug 05
			} else {
				return `W${d3.timeFormat('%U')(date)}\n${d3.timeFormat('%b %Y')(date)}`; // e.g. W32\nAug 2024
			}
		case 'month':
			// For monthly view
			if (timeSpan <= 12 * oneMonth) {
				return d3.timeFormat('%b')(date); // e.g. Aug
			} else {
				return d3.timeFormat('%b %Y')(date); // e.g. Aug 2024
			}
		default:
			// Default format based on time span
			if (timeSpan <= oneDay) {
				return d3.timeFormat('%H:%M')(date);
			} else if (timeSpan <= oneWeek) {
				return d3.timeFormat('%a %d')(date);
			} else if (timeSpan <= oneMonth) {
				return d3.timeFormat('%b %d')(date);
			} else {
				return d3.timeFormat('%b %Y')(date);
			}
	}
}

export function levelColor(level) {
	const colors = {
		DEBUG: '#10b981', // green
		INFO: '#3b82f6', // blue
		WARN: '#f59e0b', // yellow
		ERROR: '#ef4444' // red
	};
	return colors[level] || '#6b7280'; // gray as fallback
}

export function calculateBarWidth(grouped, width, margin) {
	if (!grouped || grouped.length === 0) return 5;

	const availableWidth = width - margin.left - margin.right;
	const minGap = 2; // Minimum gap between bars in pixels

	// Calculate total space needed for gaps
	const totalGapSpace = (grouped.length - 1) * minGap;

	// Calculate available space for bars
	const availableBarSpace = availableWidth - totalGapSpace;

	// Calculate bar width
	let barWidth = availableBarSpace / grouped.length;

	// Apply minimum and maximum constraints
	barWidth = Math.max(4, Math.min(20, barWidth));

	console.log(
		`📊 Bar width calculation: ${grouped.length} bars, ${availableWidth}px available, ${barWidth}px per bar`
	);

	return barWidth;
}

export function groupCloseBars(grouped, timeThreshold = 5 * 60 * 1000) {
	// 5 minutes default
	if (!grouped || grouped.length <= 1) return grouped;

	const groupedBars = [];
	let currentGroup = [grouped[0]];

	for (let i = 1; i < grouped.length; i++) {
		const currentBar = grouped[i];
		const lastBar = currentGroup[currentGroup.length - 1];

		// Check if bars are close in time
		const timeDiff = Math.abs(currentBar.time.getTime() - lastBar.time.getTime());

		if (timeDiff <= timeThreshold) {
			// Add to current group
			currentGroup.push(currentBar);
		} else {
			// Finalize current group and start new one
			if (currentGroup.length > 1) {
				// Merge bars in the group
				const mergedBar = mergeBarGroup(currentGroup);
				groupedBars.push(mergedBar);
			} else {
				// Single bar, keep as is
				groupedBars.push(currentGroup[0]);
			}

			// Start new group
			currentGroup = [currentBar];
		}
	}

	// Handle the last group
	if (currentGroup.length > 1) {
		const mergedBar = mergeBarGroup(currentGroup);
		groupedBars.push(mergedBar);
	} else {
		groupedBars.push(currentGroup[0]);
	}

	console.log(
		`📊 Grouped ${grouped.length} bars into ${groupedBars.length} bars (threshold: ${timeThreshold / 1000}s)`
	);
	return groupedBars;
}

function mergeBarGroup(bars) {
	// Use the middle time of the group
	const times = bars.map((b) => b.time.getTime());
	const middleTime = new Date((Math.min(...times) + Math.max(...times)) / 2);

	// Sum up all counts and levels
	const totalCount = bars.reduce((sum, bar) => sum + bar.count, 0);
	const mergedLevels = {};

	bars.forEach((bar) => {
		Object.entries(bar.levels).forEach(([level, count]) => {
			mergedLevels[level] = (mergedLevels[level] || 0) + count;
		});
	});

	return {
		time: middleTime,
		count: totalCount,
		levels: mergedLevels,
		groupedBars: bars.length // Track how many bars were merged
	};
}
