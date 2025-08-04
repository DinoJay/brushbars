// Internal counter to give logs unique IDs
let counter = 0;

// Log parsing function
export function parseLogLines(logText) {
	const result = [];
	const lines = logText
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);

	let current = null;

	const regex =
		/^(INFO|ERROR|WARN|DEBUG)\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\s+\[([^\]]+)]\s+(\w+):\s+(.*)$/;

	for (const line of lines) {
		const match = line.match(regex);
		if (match) {
			const [, level, timestamp, context, logger, message] = match;
			const channelMatch = context.match(/ on (\S+?) \(/);
			const channel = channelMatch ? channelMatch[1] : '(unknown)';

			current = {
				id: counter++,
				level,
				timestamp,
				channel,
				message
			};
			result.push(current);
		} else {
			if (current) {
				current.message += '\n' + line;
			} else {
				result.push({
					id: counter++,
					level: '',
					timestamp: '',
					channel: '',
					message: line
				});
			}
		}
	}

	return result;
}

// WebSocket client
let socket = null;

export function initLogSocket(onLogFull, onLogUpdate) {
	if (socket || typeof window === 'undefined') return;

	const isDev = import.meta.env.DEV;
	const wsProtocol = isDev ? 'ws' : location.protocol === 'https:' ? 'wss' : 'ws';
	const wsHost = isDev ? 'localhost:3001' : 'brberdev:3001';

	const socketUrl = `${wsProtocol}://${wsHost}/ws`;
	console.log('🔌 Connecting to WebSocket at:', socketUrl);

	socket = new WebSocket(socketUrl);

	socket.onopen = () => {
		console.log('✅ WebSocket connected');
	};

	socket.onmessage = (e) => {
		const data = JSON.parse(e.data);
		console.log('data', data);

		if (data.type === 'log-full') {
			const parsed = parseLogLines(data.logs);
			console.log('parsed', parsed);
			onLogFull(parsed);
		}

		if (data.type === 'log-update') {
			const parsed = parseLogLines(data.logs);
			onLogUpdate(parsed);
		}
	};

	socket.onerror = (err) => {
		console.error('❌ WebSocket error:', err);
	};

	socket.onclose = () => {
		console.warn('🔌 WebSocket closed');
		socket = null;
	};
}

export function closeLogSocket() {
	if (socket) {
		socket.close();
		socket = null;
	}
}
