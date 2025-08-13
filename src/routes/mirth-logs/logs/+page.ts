import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const day = url.searchParams.get('day');
	if (!day) return { success: false, logs: [] };
	try {
		const res = await fetch(`/mirth-logs/api/devLogs/${day}`);
		if (!res.ok) return { success: false, logs: [] };
		const data = await res.json();
		if (data?.success && Array.isArray(data.logs)) {
			return { success: true, logs: data.logs, day };
		}
	} catch {
		// ignore
	}
	return { success: false, logs: [], day };
};
