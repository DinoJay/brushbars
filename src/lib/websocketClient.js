// Internal counter to give logs unique IDs
let counter = 0;

// Log parsing function

// WebSocket client
let socket = null;

export function initLogSocket(onLogFull, onLogUpdate, onMessageUpdate) {
	if (socket || typeof window === 'undefined') return;

	const isDev = import.meta.env.DEV;
	const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';

	// Determine which websocket server to use based on URL param
	let selectedHost = null;
	try {
		selectedHost = new URL(window.location.href).searchParams.get('host');
	} catch {}

	const wsHost = (() => {
		if (selectedHost === 'duomed') {
			return isDev ? 'localhost:3002' : 'brberdev:3002';
		}
		return isDev ? 'localhost:3001' : 'brberdev:3001';
	})();

	const socketUrl = `${wsProtocol}://${wsHost}`;
	console.log('🔌 Connecting to WebSocket at:', socketUrl);

	socket = new WebSocket(socketUrl);

	socket.onopen = () => {
		console.log('✅ WebSocket connected');
	};

	socket.onmessage = (e) => {
		const data = JSON.parse(e.data);
		// console.log('data', data);

		if (data.type === 'log-full') {
			const parsed = data.logs;
			// console.log('parsed', parsed);
			onLogFull(parsed);
		}

		if (data.type === 'log-update') {
			const parsed = data.logs;
			// console.log('📡 WebSocket log-update received:', parsed.length, 'logs');
			if (parsed.length > 0) {
				// console.log('📊 Sample log:', parsed[0]);
				// console.log('🕐 Timestamp:', parsed[0].timestamp);
				// console.log('🏷️ Level:', parsed[0].level);
			}
			onLogUpdate(parsed);
		}

		if (data.type === 'message-update') {
			const parsed = data.messages;
			// console.log('📡 WebSocket message-update received:', parsed.length, 'messages');
			// console.log('📡 Full message data:', data);
			if (parsed.length > 0) {
				console.log('📊 Sample message:', parsed[0]);
				console.log('🕐 Timestamp:', parsed[0].timestamp);
				console.log('🕐 Timestamp type:', typeof parsed[0].timestamp);
				console.log('🏷️ Status:', parsed[0].status);
			}
			// Use separate callback for messages if provided
			if (onMessageUpdate) {
				// console.log('📡 Calling onMessageUpdate with:', parsed.length, 'messages');
				onMessageUpdate(parsed);
			} else {
				// Fallback to log update if no message callback provided
				// console.log('📡 No onMessageUpdate callback, falling back to onLogUpdate');
				onLogUpdate(parsed);
			}
		}
	};

	socket.onerror = (err) => {
		console.warn('⚠️ WebSocket connection issue:', err, 'url:', socketUrl);
	};

	socket.onclose = (ev) => {
		console.warn('🔌 WebSocket closed', { code: ev.code, reason: ev.reason });
		socket = null;
	};
}

export function closeLogSocket() {
	if (socket) {
		socket.close();
		socket = null;
	}
}
