// @ts-nocheck
import { json } from '@sveltejs/kit';
import { exampleChannels, generateChannelMessages } from '$lib/exampleData/mirthChannelsData.js';
import { getMirthChannels, getChannelMessages } from '$lib/apiHelpers.js';

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

export async function GET() {
	const IS_ATHOME =
		typeof process !== 'undefined' &&
		process?.env &&
		(process.env.ATHOME === 'true' || process.env.athome === 'true');

	if (IS_ATHOME) {
		// Use example data when ATHOME is set
		const messages = exampleChannels.flatMap((c) => generateChannelMessages(c.id, 30));
		const byDay = new Map();
		// Map for channel names
		const channelNameById = new Map(channels.map((c) => [c.id, c.name || c.id]));
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

		return json({ success: true, days, dataSource: 'example' });
	}

	// Not ATHOME: fetch channels and aggregate messages by day for last 30 days
	try {
		const channels = await getMirthChannels();
		if (!channels || channels.length === 0) {
			return json(
				{ success: false, error: 'No channels available from Mirth API', dataSource: 'mirth-api' },
				{ status: 500 }
			);
		}

		const now = new Date();
		const startDate = new Date(now);
		startDate.setDate(now.getDate() - 30);

		const byDay = new Map();
		const seenMessageIds = new Set();

		// Fetch messages per channel within range and aggregate by day
		for (const channel of channels) {
			try {
				const msgs = await getChannelMessages(channel.id, {
					startDate,
					endDate: now,
					limit: 50000,
					offset: 0,
					includeContent: false
				});
				// Debug: per-channel per-day counts to explain large day totals
				try {
					const counts = new Map();
					for (const m of msgs) {
						const k = localYmd(m.receivedDate || m.timestamp || '');
						if (!k) continue;
						counts.set(k, (counts.get(k) || 0) + 1);
					}
					console.log(
						'📈 Channel',
						channel.id,
						'per-day counts (last 30d):',
						Object.fromEntries(counts)
					);
				} catch {}
				/** @type {any[]} */
				const castMsgs = msgs;
				for (const m of castMsgs) {
					const recv = m.receivedDate || m.timestamp || '';
					const day = localYmd(recv);
					if (!day) continue;
					// Stronger dedupe across connectors and channels
					const baseId = m.id || m.messageId || m._id || '';
					const byServerAndId = `${m.serverId || ''}|${baseId}`;
					const byChain = `${m.serverId || ''}|${m.chainId || ''}|${m.orderId || ''}`;
					const msgSnippet = (m.raw || m.content || m.message || '').slice(0, 80);
					const fallback = `${day}|${String(m.status || '').toUpperCase()}|${msgSnippet}`;
					const uniqueId = baseId ? byServerAndId : m.chainId || m.orderId ? byChain : fallback;
					if (seenMessageIds.has(uniqueId)) continue;
					seenMessageIds.add(uniqueId);
					// Ensure day entry
					if (!byDay.has(day)) {
						byDay.set(day, {
							stats: { INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0 },
							channels: new Map()
						});
					}
					const entry = byDay.get(day);
					const stats = entry.stats;
					const statusUpper = String(m.status || 'INFO').toUpperCase();
					if (statusUpper === 'ERROR') stats.ERROR += 1;
					else if (statusUpper === 'WARN' || statusUpper === 'WARNING') stats.WARN += 1;
					else if (statusUpper === 'DEBUG') stats.DEBUG += 1;
					else stats.INFO += 1;
					// Per-channel counts
					const chId = m.channelId || channel.id;
					const current = entry.channels.get(chId) || 0;
					entry.channels.set(chId, current + 1);
				}
				// For today’s bucket, print min/max and sample times
				try {
					const today = localYmd(new Date());
					const todays = msgs
						.map((mm) => mm.receivedDateMs)
						.filter((v) => typeof v === 'number' && localYmd(v) === today)
						.sort((a, b) => a - b);
					if (todays.length > 0) {
						const sample = todays.slice(0, 5).concat(todays.slice(-5));
						console.log('🕒 Today diagnostics for channel', channel.id, {
							count: todays.length,
							minIso: new Date(todays[0]).toISOString(),
							maxIso: new Date(todays[todays.length - 1]).toISOString(),
							sampleIso: sample.map((t) => new Date(t).toISOString())
						});
					}
				} catch {}
			} catch (_) {
				// Continue other channels even if one fails
			}
		}

		const days = Array.from(byDay.entries())
			.map(([date, data]) => {
				// Build sorted channel breakdown
				const channelRows = Array.from(data.channels.entries())
					.map(([id, count]) => ({ id, name: channelNameById.get(id) || id, count }))
					.sort((a, b) => b.count - a.count);
				const s = data.stats;
				return {
					date,
					formattedDate: date,
					stats: { total: s.INFO + s.ERROR + s.WARN + s.DEBUG, ...s },
					channels: channelRows
				};
			})
			.sort((a, b) => a.date.localeCompare(b.date));

		return json({ success: true, days, dataSource: 'mirth-api' });
	} catch (err) {
		const details =
			err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
				? err.message
				: String(err);
		return json(
			{
				success: false,
				error: 'Failed to aggregate messages from Mirth API',
				details,
				dataSource: 'mirth-api'
			},
			{ status: 500 }
		);
	}
}
