import { json } from '@sveltejs/kit';
import { exampleChannels, generateChannelMessages } from '$lib/exampleData/mirthChannelsData.js';

export async function GET() {
	const IS_ATHOME = process.env.ATHOME === 'true' || process.env.athome === 'true';
	if (!IS_ATHOME) {
		return json({ success: true, days: [] });
	}

	// Aggregate messages for the last 30 days across all channels
	const messages = exampleChannels.flatMap((c) => generateChannelMessages(c.id, 30));
	const byDay = new Map();
	for (const m of messages) {
		const day = (m.receivedDate || '').split('T')[0];
		if (!day) continue;
		const stats = byDay.get(day) || { INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0 };
		if (m.status === 'ERROR') stats.ERROR += 1;
		else stats.INFO += 1;
		byDay.set(day, stats);
	}

	const days = Array.from(byDay.entries())
		.map(([date, s]) => ({
			date,
			formattedDate: date,
			stats: { total: s.INFO + s.ERROR + s.WARN + s.DEBUG, ...s }
		}))
		.sort((a, b) => a.date.localeCompare(b.date));

	return json({ success: true, days });
}
