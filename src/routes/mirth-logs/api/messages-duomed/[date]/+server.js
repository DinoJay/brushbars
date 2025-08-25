import { json } from '@sveltejs/kit';
import {
	exampleChannels,
	generateChannelMessages,
	EXAMPLE_MAX_PER_DAY
} from '$lib/exampleData/mirthChannelsData.js';
import https from 'https';
import http from 'http';
import { XMLParser } from 'fast-xml-parser';

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
	} catch (_) {
		return null;
	}
}

export async function GET({ params }) {
	const { date } = params;
	const IS_ATHOME =
		typeof process !== 'undefined' &&
		process?.env &&
		(process.env.ATHOME === 'true' || process.env.athome === 'true');

	if (IS_ATHOME) {
		const all = exampleChannels.flatMap((c) => generateChannelMessages(c.id, 30));
		const messages = all
			.filter((m) => (m.receivedDate || '').startsWith(date))
			.slice(0, EXAMPLE_MAX_PER_DAY)
			.map((m) => ({
				...m,
				timestamp: m.receivedDate,
				level: m.status === 'ERROR' ? 'ERROR' : 'INFO'
			}));
		return json({ success: true, date, messages, dataSource: 'example' });
	}

	// Work mode: fetch all messages for the date from Duomed Mirth API using fast-xml-parser
	try {
		const channelsXml = await duomedRequest('/api/channels');
		const channelsObj = typeof channelsXml === 'string' ? parseXml(channelsXml) : null;
		let channelIds = [];
		if (channelsObj) {
			const list =
				channelsObj?.channels?.channel || channelsObj?.list?.channel || channelsObj?.channel || [];
			const arr = Array.isArray(list) ? list : [list];
			channelIds = arr.map((c, i) => c?.id || `channel-${i}`);
		}
		if (channelIds.length === 0) {
			return json({ success: true, date, messages: [], dataSource: 'duomed' });
		}

		const startDate = new Date(`${date}T00:00:00.000Z`).toISOString();
		const endDate = new Date(`${date}T23:59:59.999Z`).toISOString();

		const combined = [];
		const seen = new Set();

		for (const channelId of channelIds) {
			let offset = 0;
			const limit = 5000;
			for (;;) {
				const path = `/api/channels/${channelId}/messages?limit=${limit}&offset=${offset}&startDate=${encodeURIComponent(
					startDate
				)}&endDate=${encodeURIComponent(endDate)}`;
				let xml = '';
				try {
					xml = await duomedRequest(path);
				} catch (_) {
					break;
				}
				if (typeof xml !== 'string' || xml.length === 0) break;
				const obj = parseXml(xml);
				const msgs = obj?.list?.message || obj?.messages?.message || obj?.message || [];
				const arr = Array.isArray(msgs) ? msgs : [msgs];
				if (arr.length === 0) break;

				for (const m of arr) {
					const id = m?.id;
					const time = m?.time;
					const status = m?.status || 'INFO';
					if (typeof time !== 'number' && typeof time !== 'string') continue;
					const ts = new Date(Number(time)).toISOString();
					if (!ts.startsWith(date)) continue;
					const uniqueId = `${channelId}:${id || time}`;
					if (seen.has(uniqueId)) continue;
					seen.add(uniqueId);
					combined.push({
						id: id || `${channelId}-${time}`,
						channelId,
						timestamp: ts,
						level: status === 'ERROR' ? 'ERROR' : 'INFO',
						status,
						message: ''
					});
				}

				offset += arr.length;
				if (arr.length < limit) break;
			}
		}

		return json({ success: true, date, messages: combined, dataSource: 'duomed' });
	} catch (err) {
		return json(
			{
				success: false,
				error: 'Failed to load Duomed messages',
				details: err && err.message ? err.message : String(err)
			},
			{ status: 500 }
		);
	}
}
