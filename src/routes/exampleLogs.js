export const exampleLogs = [
	// Reduced August 1st hourly logs (just a few key entries)
	{
		id: 0,
		level: 'DEBUG',
		timestamp: '2025-08-01T06:56:49Z',
		channel: 'channel3',
		message: 'Buffer flushed'
	},
	{
		id: 1,
		level: 'ERROR',
		timestamp: '2025-08-01T06:44:20Z',
		channel: 'channel2',
		message: 'Null pointer access'
	},
	{
		id: 2,
		level: 'WARN',
		timestamp: '2025-08-01T06:27:53Z',
		channel: 'channel2',
		message: 'Slow response detected'
	},
	{
		id: 3,
		level: 'INFO',
		timestamp: '2025-08-01T06:57:42Z',
		channel: 'channel2',
		message: 'Data validated'
	},
	{
		id: 4,
		level: 'WARN',
		timestamp: '2025-08-01T06:47:37Z',
		channel: 'channel3',
		message: 'Fallback triggered'
	},
	{
		id: 5,
		level: 'INFO',
		timestamp: '2025-08-01T06:54:01Z',
		channel: 'channel2',
		message: 'Processing started'
	},
	{
		id: 6,
		level: 'ERROR',
		timestamp: '2025-08-01T06:29:18Z',
		channel: 'channel1',
		message: 'Null pointer access'
	},
	{
		id: 7,
		level: 'INFO',
		timestamp: '2025-08-01T06:50:57Z',
		channel: 'channel3',
		message: 'Data validated'
	},
	{
		id: 8,
		level: 'DEBUG',
		timestamp: '2025-08-01T06:14:04Z',
		channel: 'channel3',
		message: 'Connection opened'
	},
	{
		id: 9,
		level: 'DEBUG',
		timestamp: '2025-08-01T06:21:11Z',
		channel: 'channel1',
		message: 'Variable x initialized'
	},
	{
		id: 10,
		level: 'INFO',
		timestamp: '2025-08-01T06:49:48Z',
		channel: 'channel1',
		message: 'Job completed'
	},

	// Additional daily logs (August 2nd-15th, 2025) - reduced set
	{
		id: 11,
		level: 'INFO',
		timestamp: '2025-08-02T09:15:30Z',
		channel: 'channel1',
		message: 'Daily backup started'
	},
	{
		id: 12,
		level: 'WARN',
		timestamp: '2025-08-02T14:22:15Z',
		channel: 'channel2',
		message: 'High memory usage detected'
	},
	{
		id: 13,
		level: 'ERROR',
		timestamp: '2025-08-02T16:45:22Z',
		channel: 'channel3',
		message: 'Database connection failed'
	},
	{
		id: 14,
		level: 'INFO',
		timestamp: '2025-08-03T08:30:45Z',
		channel: 'channel1',
		message: 'System maintenance completed'
	},
	{
		id: 15,
		level: 'DEBUG',
		timestamp: '2025-08-03T12:15:33Z',
		channel: 'channel2',
		message: 'Cache cleared successfully'
	},
	{
		id: 16,
		level: 'WARN',
		timestamp: '2025-08-04T10:20:18Z',
		channel: 'channel3',
		message: 'Disk space running low'
	},
	{
		id: 17,
		level: 'INFO',
		timestamp: '2025-08-04T15:45:27Z',
		channel: 'channel1',
		message: 'New user registration'
	},
	{
		id: 18,
		level: 'ERROR',
		timestamp: '2025-08-05T11:33:44Z',
		channel: 'channel2',
		message: 'API rate limit exceeded'
	},
	{
		id: 19,
		level: 'INFO',
		timestamp: '2025-08-05T18:12:55Z',
		channel: 'channel3',
		message: 'Data synchronization completed'
	},
	{
		id: 20,
		level: 'WARN',
		timestamp: '2025-08-06T13:25:10Z',
		channel: 'channel1',
		message: 'Unusual traffic pattern detected'
	},
	{
		id: 21,
		level: 'DEBUG',
		timestamp: '2025-08-06T20:40:33Z',
		channel: 'channel2',
		message: 'Performance metrics logged'
	},
	{
		id: 22,
		level: 'INFO',
		timestamp: '2025-08-07T07:55:42Z',
		channel: 'channel3',
		message: 'Scheduled task executed'
	},
	{
		id: 23,
		level: 'ERROR',
		timestamp: '2025-08-07T14:18:29Z',
		channel: 'channel1',
		message: 'External service timeout'
	},
	{
		id: 24,
		level: 'WARN',
		timestamp: '2025-08-08T09:30:15Z',
		channel: 'channel2',
		message: 'Certificate expiring soon'
	},
	{
		id: 25,
		level: 'INFO',
		timestamp: '2025-08-08T16:45:38Z',
		channel: 'channel3',
		message: 'Security scan completed'
	},
	{
		id: 26,
		level: 'DEBUG',
		timestamp: '2025-08-09T11:20:25Z',
		channel: 'channel1',
		message: 'Configuration updated'
	},
	{
		id: 27,
		level: 'WARN',
		timestamp: '2025-08-09T19:35:47Z',
		channel: 'channel2',
		message: 'Backup verification failed'
	},
	{
		id: 28,
		level: 'INFO',
		timestamp: '2025-08-10T08:15:33Z',
		channel: 'channel3',
		message: 'Load balancer health check'
	},
	{
		id: 29,
		level: 'ERROR',
		timestamp: '2025-08-10T15:42:18Z',
		channel: 'channel1',
		message: 'Queue processing error'
	},
	{
		id: 30,
		level: 'INFO',
		timestamp: '2025-08-11T12:30:55Z',
		channel: 'channel2',
		message: 'Database optimization completed'
	},
	{
		id: 31,
		level: 'WARN',
		timestamp: '2025-08-11T18:25:12Z',
		channel: 'channel3',
		message: 'Network latency increased'
	},
	{
		id: 32,
		level: 'DEBUG',
		timestamp: '2025-08-12T10:40:28Z',
		channel: 'channel1',
		message: 'Session timeout configured'
	},
	{
		id: 33,
		level: 'INFO',
		timestamp: '2025-08-12T17:15:45Z',
		channel: 'channel2',
		message: 'Feature flag updated'
	},
	{
		id: 34,
		level: 'ERROR',
		timestamp: '2025-08-13T13:50:22Z',
		channel: 'channel3',
		message: 'Payment processing failed'
	},
	{
		id: 35,
		level: 'WARN',
		timestamp: '2025-08-13T20:35:19Z',
		channel: 'channel1',
		message: 'Cache miss rate high'
	},
	{
		id: 36,
		level: 'INFO',
		timestamp: '2025-08-14T09:25:33Z',
		channel: 'channel2',
		message: 'User session created'
	},
	{
		id: 37,
		level: 'DEBUG',
		timestamp: '2025-08-14T16:40:47Z',
		channel: 'channel3',
		message: 'API endpoint called'
	},
	{
		id: 38,
		level: 'WARN',
		timestamp: '2025-08-15T11:55:14Z',
		channel: 'channel1',
		message: 'Resource usage alert'
	},
	{
		id: 39,
		level: 'INFO',
		timestamp: '2025-08-15T19:20:38Z',
		channel: 'channel2',
		message: 'Audit log generated'
	},

	// Monthly logs (July 2025)
	{
		id: 40,
		level: 'INFO',
		timestamp: '2025-07-01T00:00:00Z',
		channel: 'channel1',
		message: 'Monthly report generated'
	},
	{
		id: 41,
		level: 'WARN',
		timestamp: '2025-07-05T14:30:22Z',
		channel: 'channel2',
		message: 'Monthly maintenance required'
	},
	{
		id: 42,
		level: 'ERROR',
		timestamp: '2025-07-10T09:15:45Z',
		channel: 'channel3',
		message: 'Monthly backup failed'
	},
	{
		id: 43,
		level: 'INFO',
		timestamp: '2025-07-15T16:45:33Z',
		channel: 'channel1',
		message: 'Monthly security audit'
	},
	{
		id: 44,
		level: 'DEBUG',
		timestamp: '2025-07-20T11:20:18Z',
		channel: 'channel2',
		message: 'Monthly performance review'
	},
	{
		id: 45,
		level: 'WARN',
		timestamp: '2025-07-25T13:40:55Z',
		channel: 'channel3',
		message: 'Monthly quota exceeded'
	},
	{
		id: 46,
		level: 'INFO',
		timestamp: '2025-07-31T23:59:59Z',
		channel: 'channel1',
		message: 'Monthly summary completed'
	},

	// Monthly logs (June 2025)
	{
		id: 47,
		level: 'INFO',
		timestamp: '2025-06-01T00:00:00Z',
		channel: 'channel2',
		message: 'June monthly report'
	},
	{
		id: 48,
		level: 'WARN',
		timestamp: '2025-06-08T10:30:15Z',
		channel: 'channel3',
		message: 'June maintenance alert'
	},
	{
		id: 49,
		level: 'ERROR',
		timestamp: '2025-06-15T14:22:33Z',
		channel: 'channel1',
		message: 'June system outage'
	},
	{
		id: 50,
		level: 'INFO',
		timestamp: '2025-06-22T18:45:27Z',
		channel: 'channel2',
		message: 'June backup completed'
	},
	{
		id: 51,
		level: 'DEBUG',
		timestamp: '2025-06-30T23:59:59Z',
		channel: 'channel3',
		message: 'June month end processing'
	},

	// Monthly logs (May 2025)
	{
		id: 52,
		level: 'INFO',
		timestamp: '2025-05-01T00:00:00Z',
		channel: 'channel1',
		message: 'May monthly report'
	},
	{
		id: 53,
		level: 'WARN',
		timestamp: '2025-05-12T12:15:42Z',
		channel: 'channel2',
		message: 'May performance warning'
	},
	{
		id: 54,
		level: 'ERROR',
		timestamp: '2025-05-20T16:30:18Z',
		channel: 'channel3',
		message: 'May critical error'
	},
	{
		id: 55,
		level: 'INFO',
		timestamp: '2025-05-31T23:59:59Z',
		channel: 'channel1',
		message: 'May month end summary'
	},

	// Monthly logs (April 2025)
	{
		id: 56,
		level: 'INFO',
		timestamp: '2025-04-01T00:00:00Z',
		channel: 'channel2',
		message: 'April monthly report'
	},
	{
		id: 57,
		level: 'WARN',
		timestamp: '2025-04-15T09:45:33Z',
		channel: 'channel3',
		message: 'April maintenance notice'
	},
	{
		id: 58,
		level: 'INFO',
		timestamp: '2025-04-30T23:59:59Z',
		channel: 'channel1',
		message: 'April month end'
	},

	// Monthly logs (March 2025)
	{
		id: 59,
		level: 'INFO',
		timestamp: '2025-03-01T00:00:00Z',
		channel: 'channel3',
		message: 'March monthly report'
	},
	{
		id: 60,
		level: 'WARN',
		timestamp: '2025-03-18T14:20:55Z',
		channel: 'channel1',
		message: 'March system alert'
	},
	{
		id: 61,
		level: 'INFO',
		timestamp: '2025-03-31T23:59:59Z',
		channel: 'channel2',
		message: 'March month end'
	},

	// Monthly logs (February 2025)
	{
		id: 62,
		level: 'INFO',
		timestamp: '2025-02-01T00:00:00Z',
		channel: 'channel1',
		message: 'February monthly report'
	},
	{
		id: 63,
		level: 'ERROR',
		timestamp: '2025-02-14T11:30:22Z',
		channel: 'channel2',
		message: 'February critical issue'
	},
	{
		id: 64,
		level: 'INFO',
		timestamp: '2025-02-28T23:59:59Z',
		channel: 'channel3',
		message: 'February month end'
	},

	// Monthly logs (January 2025)
	{
		id: 65,
		level: 'INFO',
		timestamp: '2025-01-01T00:00:00Z',
		channel: 'channel2',
		message: 'January monthly report'
	},
	{
		id: 66,
		level: 'WARN',
		timestamp: '2025-01-15T16:45:18Z',
		channel: 'channel3',
		message: 'January maintenance'
	},
	{
		id: 67,
		level: 'INFO',
		timestamp: '2025-01-31T23:59:59Z',
		channel: 'channel1',
		message: 'January month end'
	}
];
