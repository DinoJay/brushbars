// Internal counter to give logs unique IDs
let counter = 0;

// Log parsing function

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
			const parsed = data.logs;
			console.log('parsed', parsed);
			onLogFull(parsed);
		}

		if (data.type === 'log-update') {
			const parsed = data.logs;
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
