// This route is deprecated. Use /mirth-logs/api/devLogs/days instead.
import { json } from '@sveltejs/kit';

export async function GET() {
	return json(
		{
			success: false,
			error: 'Endpoint moved to /mirth-logs/api/devLogs/days'
		},
		{ status: 410 }
	);
}
