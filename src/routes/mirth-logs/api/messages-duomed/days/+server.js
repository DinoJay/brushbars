import { json } from '@sveltejs/kit';
import { exampleChannels, generateChannelMessages } from '$lib/exampleData/mirthChannelsData.js';
import https from 'https';
import http from 'http';
import { XMLParser } from 'fast-xml-parser';

// Minimal Mirth client for Duomed host
const DUOMED_CONFIG = {
	hostname: 'duomed',
	port: 5443,
	username: 'admin',
	password: 'admin2024',
	useHttps: true
};

function duomedRequest(pathname) {
	return new Promise((resolve, reject) => {
		const auth = Buffer.from(`${DUOMED_CONFIG.username}:${DUOMED_CONFIG.password}`).toString(
			'base64'
		);
		const protocol = DUOMED_CONFIG.useHttps ? https : http;
		const req = protocol.request(
			{
				hostname: DUOMED_CONFIG.hostname,
				port: DUOMED_CONFIG.port,
				path: pathname,
				method: 'GET',
				headers: {
					Authorization: `Basic ${auth}`,
					'X-Requested-With': 'OpenAPI',
					accept: 'application/xml'
				}
			},
			(res) => {
				let data = '';
				res.on('data', (c) => (data += c));
				res.on('end', () => resolve(data));
			}
		);
		req.on('error', reject);
		req.end();
	});
}

function parseXml(xml) {
	try {
		const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
		return parser.parse(xml);
	} catch (e) {
		return null;
	}
}

export async function GET() {
	const IS_ATHOME =
		typeof process !== 'undefined' &&
		process?.env &&
		(process.env.ATHOME === 'true' || process.env.athome === 'true');

	if (IS_ATHOME) {
		// Aggregate across all example channels similar to internal
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

		return json({ success: true, days, dataSource: 'example' });
	}

	// Work mode: call Duomed Mirth to estimate per-day counts over last 30 days
	try {
		const now = new Date();
		const startDate = new Date(now);
		startDate.setDate(now.getDate() - 30);
		const formattedStart = startDate.toISOString();
		const formattedEnd = now.toISOString();

		// Fetch channels and parse via fast-xml-parser
		const channelsXml = await duomedRequest('/api/channels');
		const channelsObj = typeof channelsXml === 'string' ? parseXml(channelsXml) : null;
		let channelIds = [];
		if (channelsObj) {
			const list =
				channelsObj?.channels?.channel || channelsObj?.list?.channel || channelsObj?.channel || [];
			const arr = Array.isArray(list) ? list : [list];
			channelIds = arr.map((c, i) => c?.id || `channel-${i}`);
		}
		if (channelIds.length === 0) return json({ success: true, days: [], dataSource: 'duomed' });

		const byDay = new Map();
		const seen = new Set();

		for (const channelId of channelIds) {
			try {
				const limit = 5000;
				const path = `/api/channels/${channelId}/messages?limit=${limit}&offset=0&startDate=${encodeURIComponent(
					formattedStart
				)}&endDate=${encodeURIComponent(formattedEnd)}`;
				const messagesXml = await duomedRequest(path);
				const obj = typeof messagesXml === 'string' ? parseXml(messagesXml) : null;
				const msgs = obj?.list?.message || obj?.messages?.message || obj?.message || [];
				const arr = Array.isArray(msgs) ? msgs : [msgs];
				for (const m of arr) {
					const time = m?.time;
					if (typeof time !== 'number' && typeof time !== 'string') continue;
					const ts = new Date(Number(time)).toISOString();
					const day = ts.split('T')[0];
					const key = `${channelId}:${time}`;
					if (seen.has(key)) continue;
					seen.add(key);
					const stats = byDay.get(day) || { INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0 };
					const statusUpper = String(m?.status || 'INFO').toUpperCase();
					if (statusUpper === 'ERROR') stats.ERROR += 1;
					else if (statusUpper === 'WARN' || statusUpper === 'WARNING') stats.WARN += 1;
					else if (statusUpper === 'DEBUG') stats.DEBUG += 1;
					else stats.INFO += 1;
					byDay.set(day, stats);
				}
			} catch {
				// continue
			}
		}

		const days = Array.from(byDay.entries())
			.map(([date, s]) => ({
				date,
				formattedDate: date,
				stats: { total: s.INFO + s.ERROR + s.WARN + s.DEBUG, ...s }
			}))
			.sort((a, b) => a.date.localeCompare(b.date));

		return json({ success: true, days, dataSource: 'duomed' });
	} catch (err) {
		return json(
			{
				success: false,
				error: 'Failed to load Duomed days',
				details: err && err.message ? err.message : String(err)
			},
			{ status: 500 }
		);
	}
}
