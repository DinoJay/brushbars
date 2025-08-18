import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { parseLogLines } from '../src/lib/apiHelpers.js';

const PORT = 3002;

// UNC directory for brpharmia server logs
let LOG_DIR = \\\"\\\\brpharmia\\\\c$\\\\Program Files\\\\Mirth Connect\\\\logs\\\";

const IS_ATHOME = process.env.ATHOME === 'true' || process.env.athome === 'true';
if (IS_ATHOME) {
    LOG_DIR = path.join(process.cwd(), 'server', 'exampleData');
    console.log('🏠 ATHOME mode: using exampleData at', LOG_DIR);
}

const LOG_FILE = path.join(LOG_DIR, 'mirth.log');

const MESSAGES_API_BASE_URL = process.env.MESSAGES_API_URL || 'http://localhost:5173';
const MESSAGES_POLL_INTERVAL = 2000;
let messagesPollingInterval = null;
let lastMessagesData = null;

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_TOTAL_SIZE = 1 * 1024 * 1024 * 1024; // 1GB

const wss = new WebSocketServer({ port: PORT }, () => {
    console.log(`✅ WebSocket server (brpharmia) running on ws://localhost:${PORT}`);
});

let lastSize = 0;

function getLogFiles() {
    try {
        console.log('🔍 Scanning brpharmia log directory:', LOG_DIR);
        const allFiles = fs.readdirSync(LOG_DIR);
        const logFiles = allFiles
            .filter((file) => {
                if (file.startsWith('.') || fs.statSync(path.join(LOG_DIR, file)).isDirectory()) {
                    return false;
                }
                return file.endsWith('.log') || file.match(/\.log\.\d+$/);
            })
            .map((file) => ({
                name: file,
                path: path.join(LOG_DIR, file),
                stats: fs.statSync(path.join(LOG_DIR, file))
            }))
            .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
        console.log('📄 Log files to process (brpharmia):', logFiles.map((f) => f.name));
        return logFiles;
    } catch (err) {
        console.error('❌ Error reading brpharmia log directory:', err);
        return [];
    }
}

function readLogFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                reject(err);
                return;
            }
            const fileName = path.basename(filePath);
            if (stats.size > MAX_FILE_SIZE) {
                console.warn(
                    `⚠️ Large file detected (brpharmia): ${fileName} (${Math.round(stats.size / 1024 / 1024)}MB), reading last ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
                );
                const stream = fs.createReadStream(filePath, {
                    start: Math.max(0, stats.size - MAX_FILE_SIZE),
                    end: stats.size
                });
                let data = '';
                stream.on('data', (chunk) => {
                    data += chunk;
                });
                stream.on('end', () => resolve(data));
                stream.on('error', reject);
            } else {
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            }
        });
    });
}

function getCurrentDayLogs(logs) {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    return logs.filter((log) => new Date(log.timestamp).toISOString().split('T')[0] === todayString);
}

async function fetchMessagesFromAPI() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${MESSAGES_API_BASE_URL}/mirth-logs/api/messages/${today}`);
        if (response.ok) {
            const data = await response.json();
            return data;
        }
    } catch (error) {
        console.error('Error fetching messages from API:', error);
    }
    return null;
}

function broadcastMessages(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: 'messages-update',
                    data: data
                })
            );
        }
    });
}

function startMessagesPolling() {
    if (IS_ATHOME) {
        console.log('🏠 ATHOME mode: skipping message API polling (using synthetic data)');
        return;
    }
    if (messagesPollingInterval) return;
    messagesPollingInterval = setInterval(async () => {
        try {
            const data = await fetchMessagesFromAPI();
            if (data && data.success && data.messages) {
                const currentData = JSON.stringify(data.messages);
                if (currentData !== lastMessagesData) {
                    lastMessagesData = currentData;
                    broadcastMessages(data.messages);
                    console.log(
                        `📡 (brpharmia) Broadcasted ${data.messages.length} messages to ${wss.clients.size} clients`
                    );
                }
            }
        } catch (error) {
            console.error('❌ Error in message polling:', error);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(
                        JSON.stringify({
                            type: 'messages-error',
                            error: 'Failed to fetch messages from API'
                        })
                    );
                }
            });
        }
    }, MESSAGES_POLL_INTERVAL);
    console.log('🚀 Started messages polling (brpharmia)');
}

async function sendHistoricalLogs(ws) {
    try {
        const logFiles = getLogFiles();
        if (logFiles.length === 0) {
            ws.send(JSON.stringify({ type: 'error', message: 'No log files found in directory.' }));
            return;
        }

        console.log(`📖 (brpharmia) Reading ${logFiles.length} log files for current day logs...`);

        let allLogs = '';
        let filesRead = 0;
        let totalSize = 0;
        for (const file of logFiles) {
            if (totalSize > MAX_TOTAL_SIZE) {
                console.warn('⚠️ Reached total size limit, stopping file reading');
                break;
            }
            try {
                const logData = await readLogFile(file.path);
                if (totalSize + logData.length > MAX_TOTAL_SIZE) {
                    console.warn('⚠️ Adding this file would exceed size limit, stopping');
                    break;
                }
                allLogs += logData + '\n';
                totalSize += logData.length;
                filesRead++;
                console.log(`✅ Read (brpharmia): ${file.name} (${Math.round(logData.length / 1024)}KB)`);
            } catch (err) {
                console.error(`❌ Error reading ${file.name}:`, err);
            }
        }

        if (allLogs.trim()) {
            const parsedLogs = parseLogLines(allLogs);
            const currentDayLogs = getCurrentDayLogs(parsedLogs);
            const limitedLogs = currentDayLogs
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 1200);

            ws.send(
                JSON.stringify({
                    type: 'log-full',
                    logs: limitedLogs,
                    stats: {
                        filesRead,
                        totalSize,
                        parsedCount: parsedLogs.length,
                        sentCount: limitedLogs.length,
                        currentDayCount: currentDayLogs.length,
                        originalCount: currentDayLogs.length,
                        limitApplied: true,
                        dataType: 'current-day-complete'
                    }
                })
            );
            console.log('✅ Sent complete current day logs (brpharmia)');
        } else {
            ws.send(JSON.stringify({ type: 'error', message: 'No valid log data found in files.' }));
        }
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
            stream.on('data', (chunk) => {
                newData += chunk;
            });
            stream.on('end', () => {
                lastSize = stats.size;
                if (newData.trim()) {
                    const newLogs = parseLogLines(newData);
                    const currentDayNewLogs = getCurrentDayLogs(newLogs);
                    if (currentDayNewLogs.length > 0) {
                        const message = JSON.stringify({
                            type: 'log-update',
                            logs: currentDayNewLogs,
                            stats: { newLogsCount: currentDayNewLogs.length, totalNewLogs: newLogs.length, dataType: 'current-day-update' }
                        });
                        for (const client of wss.clients) {
                            if (client.readyState === 1) client.send(message);
                        }
                    }
                }
            });
        }
    });
}

wss.on('connection', (ws) => {
    console.log('🔌 Client connected (brpharmia)');
    ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to Mirth log stream (brpharmia)' }));
    if (wss.clients.size === 1 && !IS_ATHOME) {
        startMessagesPolling();
    }
    sendHistoricalLogs(ws);
    ws.on('close', () => {
        console.log('🔌 Client disconnected (brpharmia)');
        if (wss.clients.size === 0 && !IS_ATHOME) {
            if (messagesPollingInterval) {
                clearInterval(messagesPollingInterval);
                messagesPollingInterval = null;
                console.log('🛑 Stopped messages polling (brpharmia)');
            }
        }
    });
});

chokidar
    .watch(LOG_FILE, { usePolling: true, interval: 2000, awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 } })
    .on('change', sendNewLines);

console.log('🚀 WebSocket server ready (brpharmia)');
console.log(`📡 Real-time current day logs will be streamed from: ${LOG_FILE}`);

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down WebSocket server (brpharmia)...');
    if (messagesPollingInterval) clearInterval(messagesPollingInterval);
    wss.close(() => {
        console.log('✅ WebSocket server closed (brpharmia)');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down WebSocket server (brpharmia)...');
    if (messagesPollingInterval) clearInterval(messagesPollingInterval);
    wss.close(() => {
        console.log('✅ WebSocket server closed (brpharmia)');
        process.exit(0);
    });
});


