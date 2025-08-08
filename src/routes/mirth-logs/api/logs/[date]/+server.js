import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

// File path for storing all logs data
const ALL_LOGS_FILE = path.join(process.cwd(), 'server', 'all-logs-data.json');

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

	// Check if the all-logs-data.json file exists
	if (!fs.existsSync(ALL_LOGS_FILE)) {
		return json(
			{
				success: false,
				error: 'No logs data file found. Please load the days API first to generate the data file.',
				filePath: ALL_LOGS_FILE
			},
			{ status: 404 }
		);
	}

	try {
		// Read all logs from file
		const fileContent = fs.readFileSync(ALL_LOGS_FILE, 'utf8');
		const logsData = JSON.parse(fileContent);

		// Filter logs for the specific date
		const dayLogs = logsData.logs.filter((log) => {
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
			dataSource: 'file',
			performance: { duration: endTime - startTime, dataSource: 'file' }
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
