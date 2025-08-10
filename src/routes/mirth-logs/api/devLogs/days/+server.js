import { json } from '@sveltejs/kit';
import { loadLogsFromFile, groupLogsByDay } from '$lib/apiHelpers.js';

export async function GET() {
	const startTime = Date.now();

	// Load logs from file
	const logs = loadLogsFromFile();

	if (logs.length === 0) {
		return json(
			{
				success: false,
				error: 'No logs found. Please ensure Mirth log files exist in the logs directory.',
				filePath: 'C\\\Program Files\\\Mirth Connect\\\logs'
			},
			{ status: 404 }
		);
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
