import { json } from '@sveltejs/kit';
import * as d3 from 'd3';
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
	const availableDays = daysData.map((day) => ({
		date: day.date,
		formattedDate: d3.timeFormat('%a, %b %d')(new Date(day.date)),
		stats: day.stats
	}));

	return json({
		success: true,
		days: availableDays,
		totalDays: availableDays.length,
		totalLogs: logs.length
	});
}
