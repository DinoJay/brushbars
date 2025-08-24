import { json } from '@sveltejs/kit';
import { loadLogsFromFile } from '$lib/apiHelpers.js';
import { EXAMPLE_MAX_PER_DAY } from '$lib/exampleData/mirthChannelsData.js';

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
		const logs = loadLogsFromFile();
		const dayLogs = logs
			.filter((log) => safeGetDateString(log.timestamp) === date)
			.slice(0, EXAMPLE_MAX_PER_DAY);
		const endTime = Date.now();
		return json({
			success: true,
			date,
			logs: dayLogs,
			totalLogs: dayLogs.length,
			performance: { duration: endTime - startTime }
		});
	} catch (error) {
		const message = /** @type {any} */ (error)?.message || 'Unknown error';
		return json(
			{ success: false, error: 'Failed to read logs', details: message },
			{ status: 500 }
		);
	}
}
