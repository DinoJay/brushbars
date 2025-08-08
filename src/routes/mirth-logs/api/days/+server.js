import { json } from '@sveltejs/kit';
import { loadLogsFromFile, groupLogsByDay } from '$lib/apiHelpers.js';
import fs from 'fs';
import path from 'path';

// File path for storing all logs data
const ALL_LOGS_FILE = path.join(
	process.cwd(),
	'src',
	'routes',
	'mirth-logs',
	'api',
	'all-logs-data.json'
);

export async function GET() {
	const startTime = Date.now();

	// Load logs from file
	const logs = loadLogsFromFile();

	if (logs.length === 0) {
		return json(
			{
				success: false,
				error: 'No logs found. Please ensure Mirth log files exist in the logs directory.',
				filePath: 'C:\\Program Files\\Mirth Connect\\logs'
			},
			{ status: 404 }
		);
	}

	// Write all logs to file for individual day APIs to use
	try {
		const logsData = {
			timestamp: Date.now(),
			totalLogs: logs.length,
			logs: logs
		};
		fs.writeFileSync(ALL_LOGS_FILE, JSON.stringify(logsData, null, 2));
		console.log(`💾 Wrote ${logs.length} logs to ${ALL_LOGS_FILE}`);
	} catch (error) {
		console.warn('⚠️ Failed to write logs to file:', error.message);
		console.warn('⚠️ File path:', ALL_LOGS_FILE);
		console.warn('⚠️ Error details:', error);
	}

	// Group logs by day
	const availableDays = groupLogsByDay(logs);
	console.log('🔍 availableDays', availableDays);

	const endTime = Date.now();
	console.log(`🚀 Logs API completed in ${endTime - startTime}ms for ${availableDays.length} days`);

	return json({
		success: true,
		days: availableDays,
		totalDays: availableDays.length,
		performance: { duration: endTime - startTime }
	});
}
