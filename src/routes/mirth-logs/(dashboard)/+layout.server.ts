import type { LayoutServerLoad } from './$types';

async function fetchDays(fetchFn: typeof fetch, endpoint: string): Promise<any[]> {
	try {
		const resp = await fetchFn(endpoint);
		if (!resp.ok) return [];
		const d = await resp.json().catch(() => null);
		return (d && d.days) || [];
	} catch {
		return [];
	}
}

function mergeDaysByDate(...lists: any[][]) {
	const map = new Map<string, any>();
	for (const list of lists) {
		if (!Array.isArray(list)) continue;
		for (const d of list) {
			const prev = map.get(d.date);
			if (!prev) {
				map.set(d.date, { ...d, stats: { ...(d.stats || {}) } });
			} else {
				const keys = ['total', 'INFO', 'ERROR', 'WARN', 'DEBUG', 'WARNING', 'FATAL', 'TRACE'];
				for (const k of keys) {
					if (k === 'total') prev.total = (prev.total || 0) + (d.total || 0);
					else prev.stats[k] = (prev.stats?.[k] || 0) + (d.stats?.[k] || 0);
				}
				map.set(d.date, prev);
			}
		}
	}
	return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const load: LayoutServerLoad = async ({ url, fetch }) => {
	const sourcesParam = url.searchParams.get('sources') || 'internal';
	const sources = sourcesParam.split(',').filter(Boolean);
	const isLogs = url.pathname.includes('/logs');

	let devLogsDays: any[] = [];
	let messageDays: any[] = [];

	if (sources.length === 0) {
		return { dayButtonsData: { devLogsDays: [], messageDays: [] } };
	}

	if (isLogs) {
		const endpoints: string[] = [];
		if (sources.includes('internal')) endpoints.push('/mirth-logs/api/logs-internal/days');
		// if (sources.includes('duomed')) endpoints.push('/mirth-logs/api/logs-duomed/days');
		const lists = await Promise.all(endpoints.map((e) => fetchDays(fetch, e)));
		devLogsDays = mergeDaysByDate(...lists);
	} else {
		const endpoints: string[] = [];
		if (sources.includes('internal')) endpoints.push('/mirth-logs/api/messages-internal/days');
		// if (sources.includes('duomed')) endpoints.push('/mirth-logs/api/messages-duomed/days');
		const lists = await Promise.all(endpoints.map((e) => fetchDays(fetch, e)));
		messageDays = mergeDaysByDate(...lists);
	}

	return { dayButtonsData: { devLogsDays, messageDays } };
};
