import fs from 'fs';
import path from 'path';
import * as d3 from 'd3';

// Path to the all-logs.txt file
export const ALL_LOGS_PATH = path.join(process.cwd(), 'server', 'all-logs.txt');

// Log parsing function (shared across all API endpoints)
export function parseLogLines(logText) {
	const result = [];
	const lines = logText
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);

	let counter = 0;
	let filteredCount = 0;

	// Improved regex to handle more log formats
	const regex =
		/^(INFO|ERROR|WARN|DEBUG|WARNING|FATAL|TRACE)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+\[([^\]]+)]\s+(\w+):\s+(.*)$/;

	for (const line of lines) {
		const match = line.match(regex);
		if (match) {
			const [, level, timestamp, context, logger, message] = match;
			const channelMatch = context.match(/ on (\S+?) \(/);
			const channel = channelMatch ? channelMatch[1] : '(unknown)';

			// Normalize timestamp format (add .000 if milliseconds missing)
			let normalizedTimestamp = timestamp;
			if (!timestamp.includes('.')) {
				normalizedTimestamp = timestamp + '.000';
			}

			result.push({
				id: counter++,
				level: level.toUpperCase(),
				timestamp: normalizedTimestamp,
				channel,
				message
			});
		} else {
			// Try alternative regex patterns for different log formats
			const altRegex1 =
				/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+(INFO|ERROR|WARN|DEBUG|WARNING|FATAL|TRACE)\s+\[([^\]]+)]\s+(.*)$/;
			const altMatch1 = line.match(altRegex1);

			if (altMatch1) {
				const [, timestamp, level, context, message] = altMatch1;
				const channelMatch = context.match(/ on (\S+?) \(/);
				const channel = channelMatch ? channelMatch[1] : '(unknown)';

				let normalizedTimestamp = timestamp;
				if (!timestamp.includes('.')) {
					normalizedTimestamp = timestamp + '.000';
				}

				result.push({
					id: counter++,
					level: level.toUpperCase(),
					timestamp: normalizedTimestamp,
					channel,
					message
				});
			} else {
				// Skip lines that don't match any pattern
				filteredCount++;
				if (filteredCount <= 5) {
					console.warn('⚠️ Skipping malformed log line:', line.substring(0, 100));
				}
			}
		}
	}

	// Filter out any entries with empty timestamps (defensive)
	const validEntries = result.filter((entry) => {
		if (!entry.timestamp || entry.timestamp.trim() === '') {
			filteredCount++;
			return false;
		}
		return true;
	});

	if (filteredCount > 0) {
		console.log(`📊 Filtered out ${filteredCount} entries with invalid/missing timestamps`);
	}

	return validEntries;
}

// Load logs from all-logs.txt file
// Loads all logs from all files in the mirth logs directory
export function loadLogsFromFile() {
	try {
		// Define the Mirth logs directory (adjust as needed)
		const MIRTH_LOGS_DIR = 'C:\\Program Files\\Mirth Connect\\logs';

		if (!fs.existsSync(MIRTH_LOGS_DIR)) {
			console.warn('⚠️ Mirth logs directory not found at:', MIRTH_LOGS_DIR);
			return [];
		}

		const files = fs.readdirSync(MIRTH_LOGS_DIR);
		// .filter((file) => /^mirth\.log\d*$/i.test(file) || file.endsWith('.log'));

		if (files.length === 0) {
			console.warn('⚠️ No log files found in:', MIRTH_LOGS_DIR);
			return [];
		}

		let allLogText = '';
		for (const file of files) {
			const filePath = path.join(MIRTH_LOGS_DIR, file);
			try {
				const logText = fs.readFileSync(filePath, 'utf8');
				allLogText += logText + '\n';
			} catch (err) {
				console.warn(`⚠️ Failed to read log file: ${filePath}`, err);
			}
		}

		const logs = parseLogLines(allLogText);
		console.log(`📊 Loaded ${logs.length} logs from ${files.length} files in mirth-logs`);
		return logs;
	} catch (error) {
		console.error('❌ Error loading logs from mirth log files:', error);
		return [];
	}
}

// Helper function to group logs by day
export function groupLogsByDay(logs) {
	const dayMap = new Map();

	for (const log of logs) {
		const logDate = new Date(log.timestamp);
		const dayKey = d3.timeDay.floor(logDate);
		const dayString = d3.timeFormat('%Y-%m-%d')(dayKey);

		if (!dayMap.has(dayString)) {
			dayMap.set(dayString, {
				date: dayString,
				logs: [],
				stats: {
					total: 0,
					INFO: 0,
					ERROR: 0,
					WARN: 0,
					DEBUG: 0,
					WARNING: 0,
					FATAL: 0,
					TRACE: 0
				}
			});
		}

		const dayData = dayMap.get(dayString);
		dayData.logs.push(log);
		dayData.stats.total++;
		dayData.stats[log.level] = (dayData.stats[log.level] || 0) + 1;
	}

	return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
