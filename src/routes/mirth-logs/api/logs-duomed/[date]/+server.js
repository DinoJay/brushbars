import { json } from '@sveltejs/kit';
import { loadLogsFromDirectory } from '$lib/apiHelpers.js';
import fs from 'fs';
import path from 'path';

/** @param {any} timestamp */
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
		// UNC path for duomed logs
		const DUOMED_LOGS_DIR = '\\duomed\\c$\\ Program Files\\Mirth Connect\\logs';
		const IS_ATHOME = process.env.ATHOME === 'true' || process.env.athome === 'true';

		let logs = loadLogsFromDirectory(DUOMED_LOGS_DIR);

		if ((!logs || logs.length === 0) && IS_ATHOME) {
			// Fallback to example data in ATHOME only
			try {
				const exampleDir = path.join(process.cwd(), 'server', 'exampleData');
				if (fs.existsSync(exampleDir)) {
					const files = fs.readdirSync(exampleDir).filter((f) => /^mirth\.log(\.|$)/i.test(f));
					const { parseLogLines } = await import('$lib/apiHelpers.js');
					const combined = files
						.map((f) => fs.readFileSync(path.join(exampleDir, f), 'utf8'))
						.join('\n');
					logs = parseLogLines(combined);
				}
			} catch (e) {
				console.warn('⚠️ Failed to read example duomed logs', /** @type {any} */ (e)?.message);
			}
		}

		const dayLogs = (logs || [])
			.filter((log) => {
				const logDate = safeGetDateString(log.timestamp);
				return logDate === date;
			})
			.slice(0, 1000);

		// If still empty and not ATHOME, return 404
		if (!IS_ATHOME && dayLogs.length === 0) {
			return json(
				{ success: false, error: 'No duomed logs found for date', filePath: DUOMED_LOGS_DIR },
				{ status: 404 }
			);
		}

		const endTime = Date.now();
		return json({
			success: true,
			date,
			logs: dayLogs,
			totalLogs: dayLogs.length,
			host: 'duomed',
			dataSource: 'unc-or-example',
			performance: { duration: endTime - startTime, dataSource: 'unc-or-example' }
		});
	} catch (error) {
		console.error('❌ Error reading duomed logs:', error);
		return json(
			{
				success: false,
				error: 'Failed to read logs from duomed',
				details: /** @type {any} */ (error).message
			},
			{ status: 500 }
		);
	}
}
