import { json } from '@sveltejs/kit';
import { loadLogsFromDirectory, groupLogsByDay } from '$lib/apiHelpers.js';
import fs from 'fs';
import path from 'path';

export async function GET() {
	const startTime = Date.now();

	// UNC path for internal logs (brberdev)
	const INTERNAL_LOGS_DIR = '\\\\brberdev\\\\c$\\\\Program Files\\\\Mirth Connect\\\\logs';
	const IS_ATHOME = process.env.ATHOME === 'true' || process.env.athome === 'true';

	let logs = loadLogsFromDirectory(INTERNAL_LOGS_DIR);

	if (logs.length === 0 && IS_ATHOME) {
		// Fallback to example data in ATHOME mode only
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
			// ignore and keep logs empty
		}
	}

	// If still no logs and not in ATHOME, return 404 like before
	if (!IS_ATHOME && (!logs || logs.length === 0)) {
		return json(
			{
				success: false,
				error:
					'No logs found on brberdev. Ensure the UNC path is reachable and permissions allow reading.',
				filePath: INTERNAL_LOGS_DIR
			},
			{ status: 404 }
		);
	}

	const availableDays = groupLogsByDay(logs || []);
	const endTime = Date.now();
	return json({
		success: true,
		days: availableDays,
		totalDays: availableDays.length,
		host: 'internal',
		performance: { duration: endTime - startTime }
	});
}
