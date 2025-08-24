import { json } from '@sveltejs/kit';
import { exampleChannels, generateChannelMessages } from '$lib/exampleData/mirthChannelsData.js';

export async function GET({ params }) {
	const { date } = params;
	const IS_ATHOME = process.env.ATHOME === 'true' || process.env.athome === 'true';

	if (!IS_ATHOME) {
		return json({ success: true, date, messages: [] });
	}

	const all = exampleChannels.flatMap((c) => generateChannelMessages(c.id, 30));
	const messages = all
		.filter((m) => (m.receivedDate || '').startsWith(date))
		.slice(0, 1000)
		.map((m) => ({
			...m,
			timestamp: m.receivedDate,
			level: m.status === 'ERROR' ? 'ERROR' : 'INFO'
		}));
	return json({ success: true, date, messages });
}
