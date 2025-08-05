import { json } from '@sveltejs/kit';
import { loadLogsFromFile, groupLogsByDay } from '$lib/apiHelpers.js';

export async function GET({ params }) {
	const { date } = params;

	// Validate date format
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return json(
			{
				success: false,
				error: 'Invalid date format. Please use YYYY-MM-DD format.',
				receivedDate: date
			},
			{ status: 400 }
		);
	}

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

	// Group logs by day and find the requested day
	const daysData = groupLogsByDay(logs);
	const dayData = daysData.find((day) => day.date === date);

	if (!dayData) {
		return json(
			{
				success: false,
				error: `No logs found for date: ${date}`,
				availableDates: daysData.map((day) => day.date),
				receivedDate: date
			},
			{ status: 404 }
		);
	}

	return json({
		success: true,
		date: date,
		logs: dayData.logs,
		stats: dayData.stats,
		count: dayData.logs.length
	});
}
