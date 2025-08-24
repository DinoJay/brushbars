import type { LayoutServerLoad } from './$types';

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
	const sourcesParam = url.searchParams.get('sources') || '';
	const sources = sourcesParam.split(',').filter(Boolean);

	if (sources.length === 0) {
		return {
			dayButtonsData: { devLogsDays: [], messageDays: [] }
		};
	}

	async function fetchDays(endpoint: string) {
		try {
			const resp = await fetch(endpoint);
			if (!resp.ok) return [] as any[];
			const d = await resp.json().catch(() => null);
			return (d && (d.days || d.logs || d.messages || [])) || [];
		} catch {
			return [] as any[];
		}
	}

	const logEndpoints: string[] = [];
	if (sources.includes('internal')) logEndpoints.push('/mirth-logs/api/logs-internal/days');
	if (sources.includes('duomed')) logEndpoints.push('/mirth-logs/api/logs-duomed/days');
	const logLists = await Promise.all(logEndpoints.map(fetchDays));
	const devLogsDays = mergeDaysByDate(...logLists);

	const msgEndpoints: string[] = [];
	if (sources.includes('internal')) msgEndpoints.push('/mirth-logs/api/messages-internal/days');
	if (sources.includes('duomed')) msgEndpoints.push('/mirth-logs/api/messages-duomed/days');
	const msgLists = await Promise.all(msgEndpoints.map(fetchDays));
	const messageDays = mergeDaysByDate(...msgLists);

	return {
		dayButtonsData: { devLogsDays, messageDays }
	};
};
