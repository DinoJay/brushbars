import { json } from '@sveltejs/kit';
import {
	exampleChannels,
	generateChannelMessages,
	EXAMPLE_MAX_PER_DAY
} from '$lib/exampleData/mirthChannelsData.js';

export async function GET({ params }) {
	const { date } = params;
	const IS_ATHOME = process.env.ATHOME === 'true' || process.env.athome === 'true';

	if (!IS_ATHOME) {
		// No real duomed messages endpoint; return empty outside ATHOME
		return json({ success: true, date, messages: [] });
	}

	const all = exampleChannels.flatMap((c) => generateChannelMessages(c.id, 30));
	const messages = all
		.filter((m) => (m.receivedDate || '').startsWith(date))
		.slice(0, EXAMPLE_MAX_PER_DAY)
		.map((m) => ({
			...m,
			timestamp: m.receivedDate,
			level: m.status === 'ERROR' ? 'ERROR' : 'INFO'
		}));
	return json({ success: true, date, messages });
}
