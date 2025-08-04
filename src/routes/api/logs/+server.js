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

	const daysData = groupLogsByDay(logs);

	return json({
		success: true,
		days: daysData,
		totalDays: daysData.length,
		totalLogs: logs.length
	});
}
