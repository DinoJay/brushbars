import { json } from '@sveltejs/kit';
import { loadLogsFromFile } from '$lib/apiHelpers.js';

// No more file dependency; read logs directly

// Helper function to safely get date string
function safeGetDateString(timestamp) {
	try {
		const date = new Date(timestamp);
		return date.toISOString().split('T')[0];
	} catch {
		return null;
	}
}

export async function GET({ params }) {
	const startTime = Date.now();
	const { date } = params;

	if (!date) {
		return json({ success: false, error: 'Date parameter is required' }, { status: 400 });
	}

	try {
		// Load all logs directly
		const logs = loadLogsFromFile();

		// Filter logs for the specific date
		const dayLogs = logs.filter((log) => {
			const logDate = safeGetDateString(log.timestamp);
			return logDate === date;
		});

		const endTime = Date.now();
		console.log(
			`📦 Served ${dayLogs.length} logs for ${date} from file in ${endTime - startTime}ms`
		);

		return json({
			success: true,
			date,
			logs: dayLogs,
			totalLogs: dayLogs.length,
			dataSource: 'direct',
			performance: { duration: endTime - startTime, dataSource: 'direct' }
		});
	} catch (error) {
		console.error('❌ Error reading logs from file:', error);
		return json(
			{
				success: false,
				error: 'Failed to read logs from file',
				details: error.message
			},
			{ status: 500 }
		);
	}
}
