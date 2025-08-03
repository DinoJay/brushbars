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
	if (!grouped || grouped.length === 0) return 12;

	// Calculate the actual spacing between consecutive data points
	let minSpacing = Infinity;

	if (grouped.length > 1) {
		// Find the minimum spacing between any two consecutive bars
		for (let i = 1; i < grouped.length; i++) {
			const spacing = grouped[i].time - grouped[i - 1].time;
			if (spacing > 0 && spacing < minSpacing) {
				minSpacing = spacing;
			}
		}
	}

	// If we couldn't calculate spacing or it's too small, use a fallback
	if (minSpacing === Infinity || minSpacing < 1000) {
		const availableWidth = width - margin.left - margin.right;
		const spacing = availableWidth / grouped.length;
		return Math.max(4, Math.min(20, spacing * 0.8));
	}

	// Use a conservative approach - bars should never exceed 80% of minimum spacing
	const calculatedWidth = minSpacing * 0.8;
	const minWidth = 4;
	const maxWidth = 20;

	return Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
}
