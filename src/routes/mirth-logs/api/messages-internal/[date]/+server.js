import { json } from '@sveltejs/kit';
import {
	exampleChannels,
	generateChannelMessages,
	EXAMPLE_MAX_PER_DAY
} from '$lib/exampleData/mirthChannelsData.js';
import { getMirthChannels, getChannelMessages } from '$lib/apiHelpers.js';
import { getDayMessages, setDayMessages } from '$lib/server/messageCache.js';

/**
 * @param {string | number | Date} ts
 */
function localYmd(ts) {
	try {
		const d = new Date(ts);
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	} catch {
		return '';
	}
}

export async function GET({ params }) {
	const { date } = params;
	const IS_ATHOME =
		typeof process !== 'undefined' &&
		process?.env &&
		(process.env.ATHOME === 'true' || process.env.athome === 'true');

	// Try cache first
	const cached = getDayMessages(date);
	if (cached && Array.isArray(cached) && cached.length > 0) {
		return json({ success: true, date, messages: cached, dataSource: 'cache' });
	}

	if (IS_ATHOME) {
		// Use example data when ATHOME is set
		const all = exampleChannels.flatMap((c) => generateChannelMessages(c.id, 30));
		const messages = all
			.filter((m) => (m.receivedDate || '').startsWith(date))
			.slice(0, EXAMPLE_MAX_PER_DAY)
			.map((m) => ({
				...m,
				timestamp: m.receivedDate,
				level: m.status === 'ERROR' ? 'ERROR' : 'INFO'
			}));
		setDayMessages(date, messages);
		return json({ success: true, date, messages, dataSource: 'example' });
	}

	// Not ATHOME: fetch channels and get all messages for the specific date
	try {
		const channels = await getMirthChannels();
		if (!channels || channels.length === 0) {
			return json(
				{ success: false, error: 'No channels available from Mirth API', dataSource: 'mirth-api' },
				{ status: 500 }
			);
		}

		// Build start/end for the given date (use local boundaries, API formats with offset)
		const startDate = new Date(`${date}T00:00:00`);
		const endDate = new Date(`${date}T23:59:59.999`);

		const combined = [];
		const seen = new Set();
		for (const channel of channels) {
			let offset = 0;
			const pageSize = 5000;
			for (;;) {
				let msgs = [];
				try {
					msgs = await getChannelMessages(channel.id, {
						startDate,
						endDate,
						limit: pageSize,
						offset,
						includeContent: true
					});
					console.log(channel.id, msgs.length);
				} catch (_) {
					break;
				}
				if (!msgs || msgs.length === 0) break;
				for (const m of msgs) {
					const received = m.receivedDate || m.timestamp || '';
					// Strictly keep only entries whose LOCAL date matches the selected day
					if (localYmd(received) !== date) continue;
					// Strong dedupe across connectors and channels
					const baseId = m.id || m.messageId || m._id || '';
					const byServerAndId = `${m.serverId || ''}|${baseId}`;
					const byChain = `${m.serverId || ''}|${m.chainId || ''}|${m.orderId || ''}`;
					const msgSnippet = (m.raw || m.content || m.message || '').slice(0, 80);
					const fallback = `${date}|${String(m.status || '').toUpperCase()}|${msgSnippet}`;
					const uniqueId = baseId ? byServerAndId : m.chainId || m.orderId ? byChain : fallback;
					if (seen.has(uniqueId)) continue;
					seen.add(uniqueId);
					combined.push({
						...m,
						timestamp: received,
						level: String(m.status === 'ERROR' ? 'ERROR' : 'INFO')
					});
				}
				offset += msgs.length;
				if (msgs.length < pageSize) break;
			}
		}

		// Debug: print first 50 messages (concise fields) for verification
		try {
			const limit = Math.min(50, combined.length);
			const preview = [];
			for (let i = 0; i < limit; i++) {
				const m = combined[i];
				const raw = m.raw || m.content || null;
				const transformed = m.transformed || null;
				const encoded = m.encoded || null;
				const response = m.response || null;
				preview.push({
					idx: i,
					id: m.id || m.messageId || m._id,
					serverId: m.serverId,
					channelId: m.channelId,
					status: m.status,
					receivedDate: m.receivedDate || m.timestamp,
					chainId: m.chainId,
					orderId: m.orderId,
					content_raw: raw ? String(raw).slice(0, 400) : null,
					content_transformed: transformed ? String(transformed).slice(0, 400) : null,
					content_encoded: encoded ? String(encoded).slice(0, 400) : null,
					content_response: response ? String(response).slice(0, 400) : null
				});
			}
			// console.log('🔎 First 50 messages for', date, preview);
		} catch (e) {
			console.log('🔎 Failed to log preview messages for', date, e);
		}

		setDayMessages(date, combined);
		return json({ success: true, date, messages: combined, dataSource: 'mirth-api' });
	} catch (err) {
		const details =
			err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
				? err.message
				: String(err);
		return json(
			{
				success: false,
				error: 'Failed to fetch messages from Mirth API',
				details,
				dataSource: 'mirth-api'
			},
			{ status: 500 }
		);
	}
}
