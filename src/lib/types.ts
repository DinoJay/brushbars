export interface TimelineEntry {
	id: string | number;
	timestamp: string | Date;
	level?: string;
	channel?: string;
	message?: string;
	// Allow arbitrary extra fields for specific datasets
	[key: string]: unknown;
}
