import fs from 'fs';
import path from 'path';

// Simple synthetic data generator for API and WebSocket demos
export function generateAndWriteDataFiles() {
	const outDir = path.join(process.cwd(), 'src', 'routes', 'mirth-logs', 'api');

	// Ensure example messages file exists
	const messagesPath = path.join(outDir, 'messages', 'all-messages-data.json');
	try {
		const now = new Date();
		const today = now.toISOString().split('T')[0];
		const gen = (n = 50) =>
			Array.from({ length: n }, (_, i) => ({
				id: `msg-${i}`,
				timestamp: new Date(now.getTime() - i * 30000).toISOString(),
				level: ['INFO', 'WARN', 'ERROR'][i % 3],
				channel: ['ADT_A01', 'ORU_R01', 'SIU_S12', 'LAB_RESULTS'][i % 4],
				message: `Generated sample message ${i}`,
				status: ['PROCESSED', 'QUEUED', 'FAILED'][i % 3],
				messageId: `MSG-${1000 + i}`
			}));

		const payload = {
			success: true,
			generatedAt: now.toISOString(),
			day: today,
			messages: gen(1000)
		};
		fs.mkdirSync(path.dirname(messagesPath), { recursive: true });
		fs.writeFileSync(messagesPath, JSON.stringify(payload, null, 2));
		console.log('✅ Wrote example messages to', messagesPath);
	} catch (e) {
		console.warn('⚠️ Could not write example messages:', /** @type {any} */ (e)?.message);
	}

	// Ensure server/exampleData has a handful of mirth.log files
	const serverExampleDir = path.join(process.cwd(), 'server', 'exampleData');
	try {
		fs.mkdirSync(serverExampleDir, { recursive: true });
		const base = new Date();
		const mk = (/** @type {number} */ i) => {
			const ts = new Date(base.getTime() - i * 60000)
				.toISOString()
				.replace('T', ' ')
				.replace('Z', '');
			const lvl = ['INFO', 'WARN', 'ERROR', 'DEBUG'][i % 4];
			const ch = ['MAIN', 'PDF', 'HL7', 'LAB'][i % 4];
			return `${lvl} ${ts} [Destination Filter/Transformer JavaScript Task on ${ch} (id-${i}) < pool-1-thread-${i}>] Logger: Sample log line ${i}`;
		};
		const lines = Array.from({ length: 1000 }, (_, i) => mk(i)).join('\n');
		fs.writeFileSync(path.join(serverExampleDir, 'mirth.log'), lines);
		console.log('✅ Wrote example dev logs to', serverExampleDir);
	} catch (e) {
		console.warn('⚠️ Could not write example dev logs:', /** @type {any} */ (e)?.message);
	}
}
