import { json } from '@sveltejs/kit';
import { loadLogsFromDirectory } from '$lib/apiHelpers.js';

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
		// UNC path for brpharmia logs
		const BRPHARMIA_LOGS_DIR = '\\\\brpharmia\\c$\\Program Files\\Mirth Connect\\logs';

		const logs = loadLogsFromDirectory(BRPHARMIA_LOGS_DIR);

		// Filter logs for the specific date
		const dayLogs = logs.filter((log) => {
			const logDate = safeGetDateString(log.timestamp);
			return logDate === date;
		});

		const endTime = Date.now();
		console.log(
			`📦 Served ${dayLogs.length} logs for ${date} from brpharmia in ${endTime - startTime}ms`
		);

		return json({
			success: true,
			date,
			logs: dayLogs,
			totalLogs: dayLogs.length,
			host: 'brpharmia',
			dataSource: 'direct-unc',
			performance: { duration: endTime - startTime, dataSource: 'direct-unc' }
		});
	} catch (error) {
		console.error('❌ Error reading brpharmia logs:', error);
		return json(
			{
				success: false,
				error: 'Failed to read logs from brpharmia',
				details: error.message
			},
			{ status: 500 }
		);
	}
}
