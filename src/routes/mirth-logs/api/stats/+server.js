import { json } from '@sveltejs/kit';
import { loadLogsFromFile, groupLogsByDay } from '$lib/apiHelpers.js';

export async function GET() {
	// Load logs from file
	const logs = loadLogsFromFile();

	if (logs.length === 0) {
		return json(
			{
				success: false,
				error: 'No logs found. Please ensure all-logs.txt exists and contains valid log data.',
				filePath: 'server/all-logs.txt'
			},
			{ status: 404 }
		);
	}

	// Group logs by day to get overall statistics
	const daysData = groupLogsByDay(logs);

	// Calculate overall statistics
	const totalStats = {
		total: 0,
		INFO: 0,
		ERROR: 0,
		WARN: 0,
		DEBUG: 0,
		WARNING: 0,
		FATAL: 0,
		TRACE: 0
	};

	// Aggregate stats from all days
	daysData.forEach((day) => {
		Object.keys(day.stats).forEach((level) => {
			if (level !== 'total' && totalStats.hasOwnProperty(level)) {
				totalStats[level] = (totalStats[level] || 0) + day.stats[level];
			}
		});
	});

	totalStats.total = logs.length;

	return json({
		success: true,
		stats: totalStats,
		totalDays: daysData.length,
		totalLogs: logs.length,
		dateRange: {
			from: daysData[0]?.date,
			to: daysData[daysData.length - 1]?.date
		}
	});
}
