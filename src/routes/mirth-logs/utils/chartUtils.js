// Lightweight type hints to satisfy TS without full conversions
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
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

// Normalize various status/level strings from logs and channels to a common palette
function normalizeLevel(level) {
	const l = String(level || '').toUpperCase();
	if (['SENT', 'RECEIVED', 'PROCESSED', 'SUCCESS', 'OK', 'ACK'].includes(l)) return 'INFO';
	if (['WARN', 'WARNING', 'PENDING', 'QUEUED'].includes(l)) return 'WARN';
	if (['ERROR', 'FAILED', 'FAIL', 'NACK'].includes(l)) return 'ERROR';
	if (['DEBUG', 'TRACE'].includes(l)) return 'DEBUG';
	return l || 'INFO';
}

export function levelColor(level) {
	// Use app-wide CSS variables so colors match everywhere (light/dark safe)
	const colors = {
		DEBUG: 'var(--color-success)',
		INFO: 'var(--color-accent)',
		WARN: 'var(--color-warning)',
		ERROR: 'var(--color-error)'
	};
	const norm = normalizeLevel(level);
	return colors[norm] || colors.INFO;
}

export function calculateBarWidth(grouped, width, margin) {
	if (!grouped || grouped.length === 0) return 5;

	const availableWidth = width - margin.left - margin.right;
	const minGap = 4; // Minimum gap between bars in pixels (wider default)

	// Calculate total space needed for gaps
	const totalGapSpace = (grouped.length - 1) * minGap;

	// Calculate available space for bars
	const availableBarSpace = availableWidth - totalGapSpace;

	// Calculate bar width
	let barWidth = availableBarSpace / grouped.length;

	// Apply minimum and maximum constraints (larger bars by default)
	barWidth = Math.max(20, Math.min(40, barWidth));

	console.log(
		`📊 Bar width calculation: ${grouped.length} bars, ${availableWidth}px available, ${barWidth}px per bar`
	);

	return barWidth;
}

// Merge adjacent bars when their centers are closer than barWidth + minGapPx (in pixels)
export function joinBarsByPixelDistance(grouped, xScale, barWidth, minGapPx = 4) {
	if (!grouped || grouped.length <= 1 || !xScale) return grouped;

	const merged = [];
	let current = cloneBar(grouped[0]);

	for (let i = 1; i < grouped.length; i++) {
		const next = grouped[i];
		const cxCurr = xScale(current.time);
		const cxNext = xScale(next.time);
		const centerGap = Math.abs(cxNext - cxCurr);
		if (centerGap < barWidth + minGapPx) {
			current = mergeTwoBars(current, next);
		} else {
			merged.push(current);
			current = cloneBar(next);
		}
	}
	merged.push(current);
	return merged;
}

function cloneBar(bar) {
	return {
		time: new Date(bar.time),
		count: bar.count,
		levels: { ...(bar.levels || {}) },
		logs: Array.isArray(bar.logs) ? [...bar.logs] : []
	};
}

function mergeTwoBars(a, b) {
	const minT = Math.min(a.time.getTime(), b.time.getTime());
	const maxT = Math.max(a.time.getTime(), b.time.getTime());
	const mid = new Date((minT + maxT) / 2);
	const levels = { ...(a.levels || {}) };
	for (const [k, v] of Object.entries(b.levels || {})) {
		levels[k] = (levels[k] || 0) + v;
	}
	const logs = [...(a.logs || []), ...(b.logs || [])];
	return { time: mid, count: a.count + b.count, levels, logs };
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

// New function to calculate proper bar positions with spacing
export function calculateBarPositions(grouped, xScale, barWidth, minGap = 4) {
	if (!grouped || grouped.length === 0 || !xScale) return [];

	const [rangeStart, rangeEnd] = xScale.range();

	// Compute minimal center-to-center distance to adapt bar width
	let minCenterGap = Infinity;
	for (let i = 1; i < grouped.length; i++) {
		const prev = xScale(grouped[i - 1].time);
		const curr = xScale(grouped[i].time);
		minCenterGap = Math.min(minCenterGap, Math.abs(curr - prev));
	}
	const maxAllowedWidth = isFinite(minCenterGap) ? Math.max(2, minCenterGap - minGap) : barWidth;
	const finalWidth = Math.max(2, Math.min(barWidth, maxAllowedWidth));

	const positions = [];
	let lastBarEnd = rangeStart - minGap; // allow first bar to touch left boundary with gap logic

	for (let i = 0; i < grouped.length; i++) {
		const bar = grouped[i];
		const centerX = xScale(bar.time);

		// Center bar on time by default
		const idealX = centerX - finalWidth / 2;

		// Enforce minimum gap from previous bar and left boundary
		const minAllowedX = Math.max(lastBarEnd + minGap, rangeStart);
		let actualX = Math.max(idealX, minAllowedX);

		// Clamp to right boundary
		if (actualX + finalWidth > rangeEnd) {
			actualX = Math.max(rangeStart, rangeEnd - finalWidth);
		}

		positions.push({ bar, x: actualX, centerX: actualX + finalWidth / 2, width: finalWidth });

		lastBarEnd = actualX + finalWidth;
	}

	// Backward pass to resolve jams at the right boundary: push bars left to maintain minGap
	for (let i = positions.length - 2; i >= 0; i--) {
		const next = positions[i + 1];
		const curr = positions[i];
		const maxX = Math.min(curr.x, next.x - minGap - finalWidth);
		const clampedX = Math.max(rangeStart, maxX);
		if (clampedX < curr.x) {
			curr.x = clampedX;
			curr.centerX = curr.x + finalWidth / 2;
		}
	}

	return positions;
}

function mergeBarGroup(bars) {
	// Use the middle time of the group
	const times = bars.map((b) => b.time.getTime());
	const middleTime = new Date((Math.min(...times) + Math.max(...times)) / 2);

	// Sum up all counts and levels
	const totalCount = bars.reduce((sum, bar) => sum + bar.count, 0);
	const mergedLevels = {};

	// Merge all logs from all bars
	const mergedLogs = [];

	bars.forEach((bar) => {
		Object.entries(bar.levels).forEach(([level, count]) => {
			mergedLevels[level] = (mergedLevels[level] || 0) + count;
		});

		// Add all logs from this bar
		if (bar.logs) {
			mergedLogs.push(...bar.logs);
		}
	});

	return {
		time: middleTime,
		count: totalCount,
		levels: mergedLevels,
		logs: mergedLogs,
		groupedBars: bars.length // Track how many bars were merged
	};
}
