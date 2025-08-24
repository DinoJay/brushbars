import { json } from '@sveltejs/kit';
import { loadLogsFromFile, groupLogsByDay } from '$lib/apiHelpers.js';

export async function GET() {
	const startTime = Date.now();

	const logs = loadLogsFromFile();
	if (logs.length === 0) {
		return json(
			{
				success: false,
				error: 'No logs found. Please ensure Mirth log files exist in the logs directory.',
				filePath: 'C\\Program Files\\Mirth Connect\\logs'
			},
			{ status: 404 }
		);
	}

	const availableDays = groupLogsByDay(logs);
	const endTime = Date.now();
	return json({
		success: true,
		days: availableDays,
		totalDays: availableDays.length,
		performance: { duration: endTime - startTime }
	});
}
