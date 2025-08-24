import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
import { parseLogLines } from '../src/lib/apiHelpers.js';

const PORT = 3002;

// Duomed logs UNC or example when ATHOME
let LOG_DIR = '\\duomed\\c$\\Program Files\\Mirth Connect\\logs';
const IS_ATHOME = process.env.ATHOME === 'true' || process.env.athome === 'true';
if (IS_ATHOME) {
	LOG_DIR = path.join(process.cwd(), 'server', 'exampleData');
	console.log('🏠 ATHOME mode: using exampleData at', LOG_DIR);
}

const LOG_FILE = path.join(LOG_DIR, 'mirth.log');

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_TOTAL_SIZE = 1 * 1024 * 1024 * 1024;

const wss = new WebSocketServer({ port: PORT }, () => {
	console.log(`✅ WebSocket server (duomed) running on ws://localhost:${PORT}`);
});

let lastSize = 0;

function getLogFiles() {
	try {
		const allFiles = fs.readdirSync(LOG_DIR);
		return allFiles
			.filter((file) => {
				if (file.startsWith('.') || fs.statSync(path.join(LOG_DIR, file)).isDirectory())
					return false;
				return file.endsWith('.log') || file.match(/\.log\.\d+$/);
			})
			.map((file) => ({
				name: file,
				path: path.join(LOG_DIR, file),
				stats: fs.statSync(path.join(LOG_DIR, file))
			}))
			.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
	} catch (err) {
		console.error('❌ Error reading duomed log directory:', err);
		return [];
	}
}

function readLogFile(filePath) {
	return new Promise((resolve, reject) => {
		fs.stat(filePath, (err, stats) => {
			if (err) return reject(err);
			if (stats.size > MAX_FILE_SIZE) {
				const stream = fs.createReadStream(filePath, {
					start: Math.max(0, stats.size - MAX_FILE_SIZE),
					end: stats.size
				});
				let data = '';
				stream.on('data', (c) => (data += c));
				stream.on('end', () => resolve(data));
				stream.on('error', reject);
			} else {
				fs.readFile(filePath, 'utf8', (e, d) => (e ? reject(e) : resolve(d)));
			}
		});
	});
}

async function sendHistoricalLogs(ws) {
	try {
		const logFiles = getLogFiles();
		if (logFiles.length === 0) {
			ws.send(JSON.stringify({ type: 'error', message: 'No log files found in directory.' }));
			return;
		}
		let allLogs = '';
		let filesRead = 0;
		let totalSize = 0;
		for (const file of logFiles) {
			if (totalSize > MAX_TOTAL_SIZE) break;
			try {
				const logData = await readLogFile(file.path);
				if (totalSize + logData.length > MAX_TOTAL_SIZE) break;
				allLogs += logData + '\n';
				totalSize += logData.length;
				filesRead++;
			} catch {
				// ignore file read errors
			}
		}
		if (!allLogs.trim()) {
			ws.send(JSON.stringify({ type: 'error', message: 'No valid log data found in files.' }));
			return;
		}
		const parsedLogs = parseLogLines(allLogs);
		ws.send(
			JSON.stringify({
				type: 'log-full',
				logs: parsedLogs.slice(0, 1000),
				stats: { filesRead, totalSize }
			})
		);
	} catch (err) {
		console.error('❌ Error sending historical logs:', err);
		ws.send(JSON.stringify({ type: 'error', message: 'Failed to load historical logs.' }));
	}
}

function sendNewLines() {
	if (!fs.existsSync(LOG_FILE)) return;
	fs.stat(LOG_FILE, (err, stats) => {
		if (err) return;
		if (stats.size < lastSize) lastSize = 0;
		if (stats.size > lastSize) {
			const stream = fs.createReadStream(LOG_FILE, { start: lastSize, end: stats.size });
			let newData = '';
			stream.on('data', (c) => (newData += c));
			stream.on('end', () => {
				lastSize = stats.size;
				if (!newData.trim()) return;
				const newLogs = parseLogLines(newData);
				wss.clients.forEach((client) => {
					if (client.readyState === 1)
						client.send(JSON.stringify({ type: 'log-update', logs: newLogs }));
				});
			});
		}
	});
}

wss.on('connection', (ws) => {
	console.log('🔌 Client connected (duomed)');
	ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to Mirth log stream (duomed)' }));
	sendHistoricalLogs(ws);
});

chokidar
	.watch(LOG_FILE, {
		usePolling: true,
		interval: 2000,
		awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 }
	})
	.on('change', sendNewLines);

console.log('🚀 WebSocket server ready (duomed)');
