import { json } from '@sveltejs/kit';
import { loadLogsFromDirectory, groupLogsByDay } from '$lib/apiHelpers.js';

export async function GET() {
	const startTime = Date.now();

	// UNC path for brpharmia logs
	const BRPHARMIA_LOGS_DIR = '\\\\brpharmia\\c$\\Program Files\\Mirth Connect\\logs';

	const logs = loadLogsFromDirectory(BRPHARMIA_LOGS_DIR);

	if (logs.length === 0) {
		return json(
			{
				success: false,
				error:
					'No logs found on brpharmia. Ensure the UNC path is reachable and permissions allow reading.',
				filePath: BRPHARMIA_LOGS_DIR
			},
			{ status: 404 }
		);
	}

	const availableDays = groupLogsByDay(logs);
	const endTime = Date.now();
	console.log(
		`🚀 Brpharmia Logs days API completed in ${endTime - startTime}ms for ${availableDays.length} days`
	);

	return json({
		success: true,
		days: availableDays,
		totalDays: availableDays.length,
		host: 'brpharmia',
		performance: { duration: endTime - startTime }
	});
}
